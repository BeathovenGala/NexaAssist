import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentSource,
  AppointmentStatus,
  Prisma,
  RoleName,
  UserStatus,
} from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { generateAppointmentCode } from '../common/utils/appointment-code.util';
import {
  assertFutureSlot,
  assertTenantMembership,
  canViewAllTenantAppointments,
  isCustomerOnly,
  resolveSchedulingTenantId,
} from '../common/utils/scheduling.util';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentEventsService } from './appointment-events.service';
import type {
  CancelAppointmentDto,
  CompleteAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RejectAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointments.dto';

const ACTIVE_OVERLAP: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

const appointmentInclude = {
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true, userCode: true },
  },
  assignedStaff: {
    select: { id: true, email: true, firstName: true, lastName: true, userCode: true },
  },
  serviceType: true,
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: AppointmentEventsService,
    private readonly availability: AvailabilityService,
  ) {}

  private async ensureUsersInTenant(
    tenantId: string,
    userIds: string[],
  ): Promise<void> {
    const unique = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique }, tenantId },
    });
    if (users.length !== unique.length) {
      throw new BadRequestException(
        'customerId and assignedStaffId must belong to the tenant',
      );
    }
  }

  private listWhere(
    actor: AuthUser,
    tenantId: string,
    query: ListAppointmentsQueryDto,
  ): Prisma.AppointmentWhereInput {
    const and: Prisma.AppointmentWhereInput[] = [];

    if (canViewAllTenantAppointments(actor)) {
      if (query.staffId) {
        and.push({ assignedStaffId: query.staffId });
      }
      if (query.customerId) {
        and.push({ customerId: query.customerId });
      }
    } else if (isCustomerOnly(actor)) {
      and.push({ customerId: actor.id });
    } else {
      and.push({
        OR: [
          { assignedStaffId: actor.id },
          { customerId: actor.id },
        ],
      });
    }

    if (query.serviceTypeId) {
      and.push({ serviceTypeId: query.serviceTypeId });
    }
    if (query.status) {
      and.push({ status: query.status as AppointmentStatus });
    }
    if (query.from) {
      and.push({ startTime: { gte: new Date(query.from) } });
    }
    if (query.to) {
      and.push({ endTime: { lte: new Date(query.to) } });
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      and.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { appointmentCode: { contains: s, mode: 'insensitive' } },
          { customer: { email: { contains: s, mode: 'insensitive' } } },
          { assignedStaff: { email: { contains: s, mode: 'insensitive' } } },
        ],
      });
    }

    return {
      tenantId,
      ...(and.length ? { AND: and } : {}),
    };
  }

  private assertCanView(actor: AuthUser, row: { tenantId: string; customerId: string; assignedStaffId: string }): void {
    assertTenantMembership(actor, row.tenantId);
    if (canViewAllTenantAppointments(actor)) {
      return;
    }
    if (isCustomerOnly(actor) && row.customerId === actor.id) {
      return;
    }
    if (
      !isCustomerOnly(actor) &&
      (row.assignedStaffId === actor.id || row.customerId === actor.id)
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed to view this appointment');
  }

  private assertCanManage(
    actor: AuthUser,
    row: { tenantId: string; assignedStaffId: string; customerId: string },
    allowCustomerSelf: boolean,
  ): void {
    assertTenantMembership(actor, row.tenantId);
    if (canViewAllTenantAppointments(actor)) {
      return;
    }
    if (allowCustomerSelf && isCustomerOnly(actor) && row.customerId === actor.id) {
      return;
    }
    if (!isCustomerOnly(actor) && row.assignedStaffId === actor.id) {
      return;
    }
    if (
      actor.roles.includes(RoleName.TENANT_ADMIN) &&
      actor.tenantId === row.tenantId
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed to modify this appointment');
  }

  async listBookableStaff(actor: AuthUser, tenantIdQuery?: string) {
    const tenantId = resolveSchedulingTenantId(actor, tenantIdQuery);
    assertTenantMembership(actor, tenantId);
    const rows = await this.prisma.user.findMany({
      where: {
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userCode: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
      orderBy: { firstName: 'asc' },
      take: 200,
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      userCode: u.userCode,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));
  }

  async list(actor: AuthUser, query: ListAppointmentsQueryDto) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    const where = this.listWhere(actor, tenantId, query);
    const skip = query.skip ?? 0;
    const take = query.take ?? 25;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take,
        include: appointmentInclude,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.mapAppointment(r)),
      total,
      skip,
      take,
    };
  }

  async findOne(actor: AuthUser, id: string) {
    const row = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        ...appointmentInclude,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            performedBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanView(actor, row);
    return this.mapAppointmentDetail(row);
  }

  async create(actor: AuthUser, dto: CreateAppointmentDto) {
    const tenantId = resolveSchedulingTenantId(actor, dto.tenantId);
    assertTenantMembership(actor, tenantId);
    let customerId = dto.customerId;
    if (isCustomerOnly(actor)) {
      customerId = actor.id;
    }
    await this.ensureUsersInTenant(tenantId, [customerId, dto.assignedStaffId]);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    assertFutureSlot(start, end);
    const timezone = dto.timezone?.trim() || 'UTC';
    const source = (dto.source ??
      AppointmentSource.DASHBOARD) as AppointmentSource;

    const created = await this.prisma.$transaction(async (tx) => {
      const overlap = await tx.appointment.findFirst({
        where: {
          tenantId,
          assignedStaffId: dto.assignedStaffId,
          status: { in: ACTIVE_OVERLAP },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });
      if (overlap) {
        throw new ConflictException('Time slot is already booked');
      }
      await this.availability.assertBookableSlot(
        tx,
        tenantId,
        dto.assignedStaffId,
        start,
        end,
      );
      let code = generateAppointmentCode();
      for (let i = 0; i < 8; i++) {
        const exists = await tx.appointment.findUnique({
          where: { tenantId_appointmentCode: { tenantId, appointmentCode: code } },
        });
        if (!exists) {
          break;
        }
        code = generateAppointmentCode();
      }
      const appt = await tx.appointment.create({
        data: {
          tenantId,
          appointmentCode: code,
          customerId,
          assignedStaffId: dto.assignedStaffId,
          createdById: actor.id,
          serviceTypeId: dto.serviceTypeId ?? null,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          startTime: start,
          endTime: end,
          timezone,
          status: AppointmentStatus.PENDING,
          source,
          notes: dto.notes?.trim() ?? null,
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: appt.id,
          actionType: 'created',
          previousValue: Prisma.JsonNull,
          newValue: {
            status: appt.status,
            startTime: appt.startTime.toISOString(),
            endTime: appt.endTime.toISOString(),
          },
          performedById: actor.id,
        },
      });
      return appt;
    });

    this.events.emitAppointment({
      type: 'appointment.created',
      payload: this.eventPayload(created),
    });
    return this.mapAppointment(created);
  }

  async confirm(actor: AuthUser, id: string) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, false);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be confirmed');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CONFIRMED },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: id,
          actionType: 'confirmed',
          previousValue: { status: existing.status },
          newValue: { status: AppointmentStatus.CONFIRMED },
          performedById: actor.id,
        },
      });
      return u;
    });
    const payload = this.eventPayload(row);
    this.events.emitAppointment({
      type: 'appointment.confirmed',
      payload: {
        ...payload,
        reminderAt: new Date(
          row.startTime.getTime() - 60 * 60 * 1000,
        ).toISOString(),
      },
    });
    return this.mapAppointment(row);
  }

  async reject(actor: AuthUser, id: string, dto: RejectAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, false);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be rejected');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.REJECTED,
          cancellationReason: dto.reason?.trim() ?? 'Declined by provider',
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: id,
          actionType: 'rejected',
          previousValue: { status: existing.status },
          newValue: {
            status: AppointmentStatus.REJECTED,
            cancellationReason: u.cancellationReason,
          },
          performedById: actor.id,
        },
      });
      return u;
    });
    this.events.emitAppointment({
      type: 'appointment.rejected',
      payload: {
        ...this.eventPayload(row),
        reason: row.cancellationReason,
      },
    });
    return this.mapAppointment(row);
  }

  async update(actor: AuthUser, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, false);
    if (
      existing.status === AppointmentStatus.CANCELLED ||
      existing.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot update a finished appointment');
    }
    const start = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    if (dto.startTime || dto.endTime) {
      assertFutureSlot(start, end);
    }
    const prev = {
      title: existing.title,
      description: existing.description,
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime.toISOString(),
      timezone: existing.timezone,
      status: existing.status,
      notes: existing.notes,
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.startTime || dto.endTime) {
        const overlap = await tx.appointment.findFirst({
          where: {
            tenantId: existing.tenantId,
            assignedStaffId: existing.assignedStaffId,
            status: { in: ACTIVE_OVERLAP },
            id: { not: existing.id },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (overlap) {
          throw new ConflictException('Time slot is already booked');
        }
        await this.availability.assertBookableSlot(
          tx,
          existing.tenantId,
          existing.assignedStaffId,
          start,
          end,
        );
      }
      const row = await tx.appointment.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.startTime !== undefined ? { startTime: start } : {}),
          ...(dto.endTime !== undefined ? { endTime: end } : {}),
          ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: id,
          actionType: 'updated',
          previousValue: prev as object,
          newValue: {
            title: row.title,
            description: row.description,
            startTime: row.startTime.toISOString(),
            endTime: row.endTime.toISOString(),
            timezone: row.timezone,
            status: row.status,
            notes: row.notes,
          },
          performedById: actor.id,
        },
      });
      return row;
    });
    this.events.emitAppointment({
      type: 'appointment.updated',
      payload: { appointmentId: id, tenantId: existing.tenantId },
    });
    return this.mapAppointment(updated);
  }

  async cancel(actor: AuthUser, id: string, dto: CancelAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, true);
    if (
      existing.status === AppointmentStatus.CANCELLED ||
      existing.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException('Appointment is already closed');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: dto.cancellationReason?.trim() ?? null,
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: id,
          actionType: 'cancelled',
          previousValue: { status: existing.status },
          newValue: {
            status: u.status,
            cancellationReason: u.cancellationReason,
          },
          performedById: actor.id,
        },
      });
      return u;
    });
    this.events.emitAppointment({
      type: 'appointment.cancelled',
      payload: this.eventPayload(row),
    });
    return this.mapAppointment(row);
  }

  async reschedule(actor: AuthUser, id: string, dto: RescheduleAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, false);
    if (
      existing.status === AppointmentStatus.CANCELLED ||
      existing.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot reschedule a closed appointment');
    }
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    assertFutureSlot(start, end);
    const timezone = dto.timezone?.trim() ?? existing.timezone;

    const newAppt = await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: existing.id },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: existing.id,
          actionType: 'rescheduled',
          previousValue: {
            status: existing.status,
            startTime: existing.startTime.toISOString(),
            endTime: existing.endTime.toISOString(),
          },
          newValue: { status: AppointmentStatus.RESCHEDULED },
          performedById: actor.id,
        },
      });
      const overlap = await tx.appointment.findFirst({
        where: {
          tenantId: existing.tenantId,
          assignedStaffId: existing.assignedStaffId,
          status: { in: ACTIVE_OVERLAP },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });
      if (overlap) {
        throw new ConflictException('Time slot is already booked');
      }
      await this.availability.assertBookableSlot(
        tx,
        existing.tenantId,
        existing.assignedStaffId,
        start,
        end,
      );
      let code = generateAppointmentCode();
      for (let i = 0; i < 8; i++) {
        const exists = await tx.appointment.findUnique({
          where: {
            tenantId_appointmentCode: {
              tenantId: existing.tenantId,
              appointmentCode: code,
            },
          },
        });
        if (!exists) {
          break;
        }
        code = generateAppointmentCode();
      }
      const created = await tx.appointment.create({
        data: {
          tenantId: existing.tenantId,
          appointmentCode: code,
          customerId: existing.customerId,
          assignedStaffId: existing.assignedStaffId,
          createdById: actor.id,
          serviceTypeId: existing.serviceTypeId,
          title: existing.title,
          description: existing.description,
          startTime: start,
          endTime: end,
          timezone,
          status: AppointmentStatus.PENDING,
          source: existing.source,
          notes: existing.notes,
          rescheduledFromId: existing.id,
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: created.id,
          actionType: 'created',
          previousValue: { rescheduledFromId: existing.id },
          newValue: {
            status: created.status,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
          },
          performedById: actor.id,
        },
      });
      return created;
    });
    this.events.emitAppointment({
      type: 'appointment.rescheduled',
      payload: {
        previousAppointmentId: existing.id,
        appointmentId: newAppt.id,
        tenantId: existing.tenantId,
      },
    });
    return this.mapAppointment(newAppt);
  }

  async complete(actor: AuthUser, id: string, dto: CompleteAppointmentDto) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }
    this.assertCanManage(actor, existing, false);
    if (existing.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled appointment');
    }
    if (existing.status === AppointmentStatus.COMPLETED) {
      return this.mapAppointment(
        await this.prisma.appointment.findUniqueOrThrow({
          where: { id },
          include: appointmentInclude,
        }),
      );
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const u = await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.COMPLETED,
          ...(dto.notes !== undefined
            ? { notes: dto.notes?.trim() ?? existing.notes }
            : {}),
        },
        include: appointmentInclude,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: id,
          actionType: 'completed',
          previousValue: { status: existing.status },
          newValue: { status: u.status, notes: u.notes },
          performedById: actor.id,
        },
      });
      return u;
    });
    this.events.emitAppointment({
      type: 'appointment.completed',
      payload: { appointmentId: id, tenantId: existing.tenantId },
    });
    return this.mapAppointment(row);
  }

  private eventPayload(
    row: Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>,
  ): Record<string, unknown> {
    return {
      appointmentId: row.id,
      tenantId: row.tenantId,
      appointmentCode: row.appointmentCode,
      customerId: row.customerId,
      assignedStaffId: row.assignedStaffId,
      customerEmail: row.customer.email,
      title: row.title,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
    };
  }

  private mapAppointment(
    row: Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>,
  ) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      appointmentCode: row.appointmentCode,
      customer: row.customer,
      assignedStaff: row.assignedStaff,
      serviceType: row.serviceType,
      title: row.title,
      description: row.description,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      timezone: row.timezone,
      status: row.status,
      source: row.source,
      notes: row.notes,
      cancellationReason: row.cancellationReason,
      rescheduledFromId: row.rescheduledFromId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapAppointmentDetail(row: {
    id: string;
    tenantId: string;
    appointmentCode: string;
    customer: unknown;
    assignedStaff: unknown;
    serviceType: unknown;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    timezone: string;
    status: AppointmentStatus;
    source: AppointmentSource;
    notes: string | null;
    cancellationReason: string | null;
    rescheduledFromId: string | null;
    createdAt: Date;
    updatedAt: Date;
    history: Array<{
      id: string;
      actionType: string;
      previousValue: Prisma.JsonValue | null;
      newValue: Prisma.JsonValue | null;
      performedBy: {
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
      };
      createdAt: Date;
    }>;
  }) {
    const base = this.mapAppointment(
      row as unknown as Prisma.AppointmentGetPayload<{
        include: typeof appointmentInclude;
      }>,
    );
    return {
      ...base,
      history: row.history.map((h) => ({
        id: h.id,
        actionType: h.actionType,
        previousValue: h.previousValue,
        newValue: h.newValue,
        performedBy: h.performedBy,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }
}
