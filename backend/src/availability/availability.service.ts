import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  PrismaClient,
  RecurrenceType,
  RoleName,
  SlotType,
  UserStatus,
} from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  expandRecurringRulesToWindows,
  intervalContainedInUnion,
  mergeIntervals,
} from '../common/utils/availability-window.util';
import {
  assertTenantMembership,
  canViewAllTenantAppointments,
  effectiveSlotStart,
  isCustomerOnly,
  resolveSchedulingTenantId,
} from '../common/utils/scheduling.util';
import type {
  CreateAvailabilityDto,
  CreateBlockedSlotDto,
  FreeSlotsQueryDto,
  ListAvailabilityQueryDto,
  ListBlockedQueryDto,
  UpdateAvailabilitySlotDto,
} from './dto/availability.dto';

type Interval = { start: Date; end: Date };

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  let result = [...base];
  for (const c of cuts) {
    const next: Interval[] = [];
    for (const r of result) {
      if (!overlaps(r, c)) {
        next.push(r);
        continue;
      }
      if (c.start > r.start) {
        next.push({ start: r.start, end: minDate(c.start, r.end) });
      }
      if (c.end < r.end) {
        next.push({ start: maxDate(c.end, r.start), end: r.end });
      }
    }
    result = next.filter((x) => x.start < x.end);
  }
  return result;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function splitByDuration(
  windows: Interval[],
  durationMs: number,
): Interval[] {
  const slots: Interval[] = [];
  for (const w of windows) {
    let cur = w.start.getTime();
    const end = w.end.getTime();
    while (cur + durationMs <= end) {
      slots.push({
        start: new Date(cur),
        end: new Date(cur + durationMs),
      });
      cur += durationMs;
    }
  }
  return slots;
}

/** Prisma client or interactive transaction client (same model delegates). */
type PrismaSchedulingDb = Pick<
  PrismaClient,
  'recurringAvailabilityRule' | 'availabilitySlot' | 'blockedSlot'
>;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates that [start, end) does not overlap blocked time and lies within
   * merged recurring rules + explicit availability windows.
   * Use inside Prisma interactive transactions with `tx` as `db`.
   */
  async assertBookableSlot(
    db: PrismaSchedulingDb,
    tenantId: string,
    staffId: string,
    start: Date,
    end: Date,
  ): Promise<void> {
    if (!(start < end)) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const blocked = await db.blockedSlot.findFirst({
      where: {
        tenantId,
        staffId,
        blockedFrom: { lt: end },
        blockedTo: { gt: start },
      },
    });
    if (blocked) {
      throw new ConflictException(
        'Selected time overlaps staff leave or blocked time',
      );
    }
    const rules = await db.recurringAvailabilityRule.findMany({
      where: {
        tenantId,
        staffId,
        effectiveFrom: { lte: end },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: start } }],
      },
    });
    const recurringWindows = expandRecurringRulesToWindows(rules, start, end);
    const explicitRows = await db.availabilitySlot.findMany({
      where: {
        tenantId,
        staffId,
        isAvailable: true,
        slotType: SlotType.AVAILABLE,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    const explicitWindows = explicitRows.map((s) => ({
      start: maxDate(s.startTime, start),
      end: minDate(s.endTime, end),
    }));
    const windows = mergeIntervals([...recurringWindows, ...explicitWindows]).filter(
      (w) => w.start < w.end,
    );
    if (!intervalContainedInUnion({ start, end }, windows)) {
      throw new BadRequestException(
        'Selected time is outside staff availability',
      );
    }
  }

  private assertStaffAccess(actor: AuthUser, staffId: string): void {
    if (canViewAllTenantAppointments(actor)) {
      return;
    }
    if (actor.id === staffId) {
      return;
    }
    if (isCustomerOnly(actor)) {
      throw new ForbiddenException('Cannot manage this staff schedule');
    }
    throw new ForbiddenException('Not allowed to manage this staff schedule');
  }

  /** Active tenant user who can be selected as appointment provider (matches bookable-staff). */
  private async isBookableStaffInTenant(
    tenantId: string,
    staffId: string,
  ): Promise<boolean> {
    const row = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        tenantId,
        status: UserStatus.ACTIVE,
        userRoles: {
          some: {
            role: {
              name: {
                in: [
                  RoleName.DOCTOR,
                  RoleName.STAFF,
                  RoleName.RECEPTIONIST,
                  RoleName.TENANT_ADMIN,
                ],
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return !!row;
  }

  /** Read-only: own schedule, org-wide viewers, or any bookable provider (e.g. customer booking). */
  private async assertStaffReadable(
    actor: AuthUser,
    staffId: string,
    tenantId: string,
  ): Promise<void> {
    assertTenantMembership(actor, tenantId);
    if (canViewAllTenantAppointments(actor)) {
      return;
    }
    if (actor.id === staffId) {
      return;
    }
    if (await this.isBookableStaffInTenant(tenantId, staffId)) {
      return;
    }
    throw new ForbiddenException('Not allowed to view this staff schedule');
  }

  async create(actor: AuthUser, dto: CreateAvailabilityDto) {
    if (dto.kind === 'slot') {
      const s = dto.slot;
      if (!s) {
        throw new BadRequestException('slot payload required');
      }
      return this.createSlot(actor, s);
    }
    const r = dto.recurring;
    if (!r) {
      throw new BadRequestException('recurring payload required');
    }
    return this.createRecurring(actor, r);
  }

  private async createSlot(
    actor: AuthUser,
    s: NonNullable<CreateAvailabilityDto['slot']>,
  ) {
    const tenantId = resolveSchedulingTenantId(actor, s.tenantId);
    assertTenantMembership(actor, tenantId);
    this.assertStaffAccess(actor, s.staffId);
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    if (!(start < end)) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const row = await this.prisma.availabilitySlot.create({
      data: {
        tenantId,
        staffId: s.staffId,
        startTime: start,
        endTime: end,
        slotType: SlotType.AVAILABLE,
        isAvailable: s.isAvailable ?? true,
      },
    });
    return this.mapSlot(row);
  }

  private async createRecurring(
    actor: AuthUser,
    r: NonNullable<CreateAvailabilityDto['recurring']>,
  ) {
    const tenantId = resolveSchedulingTenantId(actor, r.tenantId);
    assertTenantMembership(actor, tenantId);
    this.assertStaffAccess(actor, r.staffId);
    const effectiveFrom = new Date(r.effectiveFrom);
    const effectiveUntil = r.effectiveUntil
      ? new Date(r.effectiveUntil)
      : null;
    const row = await this.prisma.recurringAvailabilityRule.create({
      data: {
        tenantId,
        staffId: r.staffId,
        dayOfWeek: r.dayOfWeek,
        startHour: r.startHour,
        startMinute: r.startMinute ?? 0,
        endHour: r.endHour,
        endMinute: r.endMinute ?? 0,
        recurrenceType: (r.recurrenceType ??
          'WEEKLY') as RecurrenceType,
        effectiveFrom,
        effectiveUntil,
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      staffId: row.staffId,
      dayOfWeek: row.dayOfWeek,
      startHour: row.startHour,
      startMinute: row.startMinute,
      endHour: row.endHour,
      endMinute: row.endMinute,
      recurrenceType: row.recurrenceType,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listSlots(actor: AuthUser, query: ListAvailabilityQueryDto) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    await this.assertStaffReadable(actor, query.staffId, tenantId);
    const from = new Date(query.from);
    const to = new Date(query.to);
    const rows = await this.prisma.availabilitySlot.findMany({
      where: {
        tenantId,
        staffId: query.staffId,
        startTime: { lt: to },
        endTime: { gt: from },
      },
      orderBy: { startTime: 'asc' },
    });
    return rows.map((r) => this.mapSlot(r));
  }

  async listRecurring(actor: AuthUser, staffId: string, tenantIdQuery?: string) {
    const tenantId = resolveSchedulingTenantId(actor, tenantIdQuery);
    assertTenantMembership(actor, tenantId);
    await this.assertStaffReadable(actor, staffId, tenantId);
    const rows = await this.prisma.recurringAvailabilityRule.findMany({
      where: { tenantId, staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      staffId: r.staffId,
      dayOfWeek: r.dayOfWeek,
      startHour: r.startHour,
      startMinute: r.startMinute,
      endHour: r.endHour,
      endMinute: r.endMinute,
      recurrenceType: r.recurrenceType,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async updateSlot(
    actor: AuthUser,
    id: string,
    dto: UpdateAvailabilitySlotDto,
  ) {
    const existing = await this.prisma.availabilitySlot.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Availability slot not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    this.assertStaffAccess(actor, existing.staffId);
    const start = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    if (!(start < end)) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const row = await this.prisma.availabilitySlot.update({
      where: { id },
      data: {
        startTime: start,
        endTime: end,
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      },
    });
    return this.mapSlot(row);
  }

  async deleteSlot(actor: AuthUser, id: string) {
    const existing = await this.prisma.availabilitySlot.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Availability slot not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    this.assertStaffAccess(actor, existing.staffId);
    await this.prisma.availabilitySlot.delete({ where: { id } });
    return { deleted: true };
  }

  async deleteRecurring(actor: AuthUser, id: string) {
    const existing = await this.prisma.recurringAvailabilityRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Recurring rule not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    this.assertStaffAccess(actor, existing.staffId);
    await this.prisma.recurringAvailabilityRule.delete({ where: { id } });
    return { deleted: true };
  }

  async createBlocked(actor: AuthUser, dto: CreateBlockedSlotDto) {
    const tenantId = resolveSchedulingTenantId(actor, dto.tenantId);
    assertTenantMembership(actor, tenantId);
    this.assertStaffAccess(actor, dto.staffId);
    const blockedFrom = new Date(dto.blockedFrom);
    const blockedTo = new Date(dto.blockedTo);
    if (!(blockedFrom < blockedTo)) {
      throw new BadRequestException('blockedFrom must be before blockedTo');
    }
    const typeTag = dto.blockedType?.trim().toUpperCase();
    const note = dto.reason?.trim();
    let reason: string | null = null;
    if (typeTag && note) {
      reason = `[${typeTag}] ${note}`;
    } else if (typeTag) {
      reason = `[${typeTag}]`;
    } else if (note) {
      reason = note;
    }
    const row = await this.prisma.blockedSlot.create({
      data: {
        tenantId,
        staffId: dto.staffId,
        reason,
        blockedFrom,
        blockedTo,
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      staffId: row.staffId,
      reason: row.reason,
      blockedFrom: row.blockedFrom,
      blockedTo: row.blockedTo,
      createdAt: row.createdAt,
    };
  }

  async listBlocked(actor: AuthUser, query: ListBlockedQueryDto) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    await this.assertStaffReadable(actor, query.staffId, tenantId);
    const from = new Date(query.from);
    const to = new Date(query.to);
    const rows = await this.prisma.blockedSlot.findMany({
      where: {
        tenantId,
        staffId: query.staffId,
        blockedFrom: { lt: to },
        blockedTo: { gt: from },
      },
      orderBy: { blockedFrom: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      staffId: r.staffId,
      reason: r.reason,
      blockedFrom: r.blockedFrom,
      blockedTo: r.blockedTo,
      createdAt: r.createdAt,
    }));
  }

  async deleteBlocked(actor: AuthUser, id: string) {
    const existing = await this.prisma.blockedSlot.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Blocked slot not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    this.assertStaffAccess(actor, existing.staffId);
    await this.prisma.blockedSlot.delete({ where: { id } });
    return { deleted: true };
  }

  async freeSlots(actor: AuthUser, query: FreeSlotsQueryDto) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    await this.assertStaffReadable(actor, query.staffId, tenantId);
    let from = new Date(query.from);
    const to = new Date(query.to);
    if (!(from < to)) {
      throw new BadRequestException('from must be before to');
    }
    const now = new Date();
    if (to <= now) {
      return [];
    }
    from = effectiveSlotStart(from);
    if (!(from < to)) {
      return [];
    }
    const durationMs =
      (query.durationMinutes ?? 30) * 60 * 1000;

    const rules = await this.prisma.recurringAvailabilityRule.findMany({
      where: {
        tenantId,
        staffId: query.staffId,
        effectiveFrom: { lte: to },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: from } }],
      },
    });
    const recurringWindows = expandRecurringRulesToWindows(rules, from, to);

    const explicit = await this.prisma.availabilitySlot.findMany({
      where: {
        tenantId,
        staffId: query.staffId,
        isAvailable: true,
        slotType: SlotType.AVAILABLE,
        startTime: { lt: to },
        endTime: { gt: from },
      },
    });
    const explicitWindows: Interval[] = explicit.map((s) => ({
      start: maxDate(s.startTime, from),
      end: minDate(s.endTime, to),
    }));

    let windows = mergeIntervals([...recurringWindows, ...explicitWindows]).filter(
      (w) => w.start < w.end,
    );

    const blocked = await this.prisma.blockedSlot.findMany({
      where: {
        tenantId,
        staffId: query.staffId,
        blockedFrom: { lt: to },
        blockedTo: { gt: from },
      },
    });
    const busyAppts = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedStaffId: query.staffId,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
        startTime: { lt: to },
        endTime: { gt: from },
      },
    });

    const cuts: Interval[] = [
      ...blocked.map((b) => ({
        start: maxDate(b.blockedFrom, from),
        end: minDate(b.blockedTo, to),
      })),
      ...busyAppts.map((a) => ({
        start: maxDate(a.startTime, from),
        end: minDate(a.endTime, to),
      })),
    ];

    const free = subtractIntervals(windows, cuts);
    const slots = splitByDuration(free, durationMs);
    return slots.map((s) => ({
      startTime: s.start.toISOString(),
      endTime: s.end.toISOString(),
    }));
  }

  private mapSlot(row: {
    id: string;
    tenantId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    slotType: SlotType;
    isAvailable: boolean;
    recurrenceGroupId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      staffId: row.staffId,
      startTime: row.startTime,
      endTime: row.endTime,
      slotType: row.slotType,
      isAvailable: row.isAvailable,
      recurrenceGroupId: row.recurrenceGroupId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
