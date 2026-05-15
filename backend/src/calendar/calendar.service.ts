import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SlotType,
} from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  expandRecurringRulesToWindows,
  mergeIntervals,
} from '../common/utils/availability-window.util';
import {
  assertTenantMembership,
  canViewAllTenantAppointments,
  isCustomerOnly,
  resolveSchedulingTenantId,
} from '../common/utils/scheduling.util';
import type { CalendarRangeQueryDto } from './dto/calendar.dto';

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

function addUtcDays(d: Date, days: number): Date {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + days);
  return t;
}

function startOfUtcWeekMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(startOfUtcDay(d), diff);
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(d: Date): Date {
  const first = startOfUtcMonth(d);
  const next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(
    view: 'day' | 'week' | 'month',
    date: Date,
  ): { from: Date; to: Date } {
    if (view === 'day') {
      const from = startOfUtcDay(date);
      const to = addUtcDays(from, 1);
      return { from, to };
    }
    if (view === 'week') {
      const from = startOfUtcWeekMonday(date);
      const to = addUtcDays(from, 7);
      return { from, to };
    }
    const from = startOfUtcMonth(date);
    const to = endOfUtcMonth(date);
    return { from, to };
  }

  private appointmentWhere(
    actor: AuthUser,
    tenantId: string,
    staffId: string | undefined,
    from: Date,
    to: Date,
  ): Prisma.AppointmentWhereInput {
    const and: Prisma.AppointmentWhereInput[] = [
      { startTime: { lt: to } },
      { endTime: { gt: from } },
    ];
    if (staffId) {
      and.push({ assignedStaffId: staffId });
    } else if (!canViewAllTenantAppointments(actor)) {
      if (isCustomerOnly(actor)) {
        and.push({ customerId: actor.id });
      } else {
        and.push({
          OR: [
            { assignedStaffId: actor.id },
            { customerId: actor.id },
          ],
        });
      }
    }
    return { tenantId, AND: and };
  }

  async getView(
    actor: AuthUser,
    view: 'day' | 'week' | 'month',
    query: CalendarRangeQueryDto,
  ) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    const anchor = new Date(query.date);
    const { from, to } = this.resolveRange(view, anchor);
    const max = Math.min(Math.max(query.maxAppointments ?? 500, 1), 2000);

    const apptWhere = this.appointmentWhere(
      actor,
      tenantId,
      query.staffId,
      from,
      to,
    );

    const [appointments, explicitAvailability, blockedSlots, recurringRules] =
      await Promise.all([
      this.prisma.appointment.findMany({
        where: apptWhere,
        orderBy: { startTime: 'asc' },
        take: max,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedStaff: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          serviceType: true,
        },
      }),
      query.staffId
        ? this.prisma.availabilitySlot.findMany({
            where: {
              tenantId,
              staffId: query.staffId,
              isAvailable: true,
              slotType: SlotType.AVAILABLE,
              startTime: { lt: to },
              endTime: { gt: from },
            },
            orderBy: { startTime: 'asc' },
          })
        : Promise.resolve(
            [] as Awaited<
              ReturnType<typeof this.prisma.availabilitySlot.findMany>
            >,
          ),
      query.staffId
        ? this.prisma.blockedSlot.findMany({
            where: {
              tenantId,
              staffId: query.staffId,
              blockedFrom: { lt: to },
              blockedTo: { gt: from },
            },
            orderBy: { blockedFrom: 'asc' },
          })
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof this.prisma.blockedSlot.findMany>>,
          ),
      query.staffId
        ? this.prisma.recurringAvailabilityRule.findMany({
            where: {
              tenantId,
              staffId: query.staffId,
              effectiveFrom: { lte: to },
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: from } }],
            },
          })
        : Promise.resolve(
            [] as Awaited<
              ReturnType<typeof this.prisma.recurringAvailabilityRule.findMany>
            >,
          ),
    ]);

    const mergedAvailability =
      query.staffId && (explicitAvailability.length || recurringRules.length)
        ? mergeIntervals([
            ...explicitAvailability.map((s) => ({
              start: s.startTime,
              end: s.endTime,
            })),
            ...expandRecurringRulesToWindows(recurringRules, from, to),
          ]).map((w, i) => ({
            id: `availability-${w.start.toISOString()}-${i}`,
            staffId: query.staffId,
            startTime: w.start.toISOString(),
            endTime: w.end.toISOString(),
            slotType: SlotType.AVAILABLE,
          }))
        : explicitAvailability.map((s) => ({
            id: s.id,
            staffId: s.staffId,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime.toISOString(),
            slotType: s.slotType,
          }));

    return {
      view,
      range: { from: from.toISOString(), to: to.toISOString() },
      staffId: query.staffId ?? null,
      appointments: appointments.map((a) => ({
        id: a.id,
        appointmentCode: a.appointmentCode,
        title: a.title,
        status: a.status,
        source: a.source,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        timezone: a.timezone,
        customer: a.customer,
        assignedStaff: a.assignedStaff,
        serviceType: a.serviceType,
      })),
      availabilitySlots: mergedAvailability,
      blockedSlots: blockedSlots.map((b) => ({
        id: b.id,
        staffId: b.staffId,
        reason: b.reason,
        blockedFrom: b.blockedFrom.toISOString(),
        blockedTo: b.blockedTo.toISOString(),
      })),
    };
  }
}
