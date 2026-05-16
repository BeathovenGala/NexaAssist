import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { AppointmentEventsService } from '../appointments/appointment-events.service';
import { InventoryEventsService } from '../inventory/inventory-events.service';
import { QueueProducerService } from '../queues/queue-producer.service';

@Injectable()
export class DomainEventsListener implements OnModuleInit {
  private readonly logger = new Logger(DomainEventsListener.name);

  constructor(
    private readonly appointmentEvents: AppointmentEventsService,
    private readonly inventoryEvents: InventoryEventsService,
    private readonly queues: QueueProducerService,
  ) {}

  onModuleInit(): void {
    this.appointmentEvents.on(
      'appointment.created',
      (payload: Record<string, unknown>) => {
        void this.onAppointmentCreated(payload);
      },
    );
    this.appointmentEvents.on(
      'appointment.confirmed',
      (payload: Record<string, unknown>) => {
        void this.onAppointmentConfirmed(payload);
      },
    );
    this.appointmentEvents.on(
      'appointment.rejected',
      (payload: Record<string, unknown>) => {
        void this.onAppointmentRejected(payload);
      },
    );
    this.appointmentEvents.on(
      'appointment.cancelled',
      (payload: Record<string, unknown>) => {
        void this.onAppointmentCancelled(payload);
      },
    );
    this.inventoryEvents.on(
      'inventory.alert.created',
      (payload: Record<string, unknown>) => {
        void this.queues.enqueueInventoryNotify({
          tenantId: String(payload.tenantId),
          type: 'alert',
          alertId: String(payload.alertId),
          itemId: payload.itemId ? String(payload.itemId) : undefined,
          dedupeKey: `inventory:alert:${payload.alertId}`,
          priority: 'HIGH',
        });
      },
    );
    this.inventoryEvents.on(
      'inventory.request.created',
      (payload: Record<string, unknown>) => {
        void this.queues.enqueueInventoryNotify({
          tenantId: String(payload.tenantId),
          type: 'request',
          requestId: String(payload.requestId),
          itemId: payload.itemId ? String(payload.itemId) : undefined,
          dedupeKey: `inventory:request:${payload.requestId}`,
          priority: 'NORMAL',
        });
      },
    );
  }

  private async onAppointmentCreated(payload: Record<string, unknown>) {
    const tenantId = String(payload.tenantId);
    const appointmentId = String(payload.appointmentId);
    const assignedStaffId = String(payload.assignedStaffId);
    const customerId = String(payload.customerId);

    await this.queues.enqueueNotification({
      tenantId,
      userId: assignedStaffId,
      type: NotificationType.APPOINTMENT,
      title: 'New appointment request',
      message: `A new appointment request (${payload.appointmentCode ?? appointmentId}) needs your review.`,
      actionUrl: `/dashboard/appointments/${appointmentId}`,
      dedupeKey: `appointment:${appointmentId}:created:staff`,
      priority: 'HIGH',
      metadata: { appointmentId },
    });

    if (payload.customerEmail) {
      await this.queues.enqueueEmail({
        tenantId,
        to: String(payload.customerEmail),
        template: 'appointment-confirmation',
        subject: '',
        context: payload,
        dedupeKey: `email:appointment:${appointmentId}:confirmation`,
      });
    }

  }

  private async onAppointmentConfirmed(payload: Record<string, unknown>) {
    const tenantId = String(payload.tenantId);
    const appointmentId = String(payload.appointmentId);
    const customerId = String(payload.customerId);

    if (payload.reminderAt) {
      const delay = Math.max(
        0,
        new Date(String(payload.reminderAt)).getTime() - Date.now(),
      );
      await this.queues.enqueueScheduleReminder(
        {
          tenantId,
          appointmentId,
          scheduledAt: String(payload.reminderAt),
        },
        delay,
      );
    }

    await this.queues.enqueueNotification({
      tenantId,
      userId: customerId,
      type: NotificationType.APPOINTMENT,
      title: 'Booking confirmed',
      message: `Your appointment (${payload.appointmentCode ?? appointmentId}) has been confirmed.`,
      actionUrl: `/dashboard/appointments/${appointmentId}`,
      dedupeKey: `appointment:${appointmentId}:confirmed:customer`,
      priority: 'HIGH',
      metadata: { appointmentId },
    });

    if (payload.customerEmail) {
      await this.queues.enqueueEmail({
        tenantId,
        to: String(payload.customerEmail),
        template: 'appointment-confirmed',
        subject: '',
        context: payload,
        dedupeKey: `email:appointment:${appointmentId}:confirmed`,
      });
    }
  }

  private async onAppointmentRejected(payload: Record<string, unknown>) {
    const tenantId = String(payload.tenantId);
    const appointmentId = String(payload.appointmentId);
    const customerId = String(payload.customerId);

    await this.queues.enqueueNotification({
      tenantId,
      userId: customerId,
      type: NotificationType.APPOINTMENT,
      title: 'Appointment declined',
      message: `Your appointment request was declined by the provider.`,
      actionUrl: `/dashboard/appointments/${appointmentId}`,
      dedupeKey: `appointment:${appointmentId}:rejected:customer`,
      priority: 'HIGH',
      metadata: { appointmentId },
    });

    if (payload.customerEmail) {
      await this.queues.enqueueEmail({
        tenantId,
        to: String(payload.customerEmail),
        template: 'appointment-declined',
        subject: '',
        context: payload,
        dedupeKey: `email:appointment:${appointmentId}:declined`,
      });
    }
  }

  private async onAppointmentCancelled(payload: Record<string, unknown>) {
    const tenantId = String(payload.tenantId);
    const appointmentId = String(payload.appointmentId);
    const notifyIds = [
      payload.customerId,
      payload.assignedStaffId,
    ].filter(Boolean) as string[];

    for (const userId of notifyIds) {
      await this.queues.enqueueNotification({
        tenantId,
        userId: String(userId),
        type: NotificationType.APPOINTMENT,
        title: 'Appointment cancelled',
        message: `Appointment ${payload.appointmentCode ?? appointmentId} was cancelled.`,
        actionUrl: `/dashboard/appointments/${appointmentId}`,
        dedupeKey: `appointment:${appointmentId}:cancelled:${userId}`,
        priority: 'NORMAL',
        metadata: { appointmentId },
      });
    }
  }
}
