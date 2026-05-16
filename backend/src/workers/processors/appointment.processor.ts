import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueProducerService } from '../../queues/queue-producer.service';
import type {
  ProcessReminderJobPayload,
  ScheduleReminderJobPayload,
} from '../../queues/queue-job.types';
import { MailerService } from '../../emails/mailer.service';

@Injectable()
export class AppointmentProcessor {
  private readonly logger = new Logger(AppointmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
    private readonly mailer: MailerService,
  ) {}

  async processScheduleReminder(
    job: Job<ScheduleReminderJobPayload>,
  ): Promise<void> {
    const { tenantId, appointmentId, scheduledAt } = job.data;
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
      include: { customer: { select: { email: true } } },
    });
    if (!appt || appt.status !== 'CONFIRMED') {
      return;
    }
    const reminder = await this.prisma.appointmentReminder.create({
      data: {
        appointmentId,
        scheduledAt: new Date(scheduledAt),
        channel: 'email',
      },
    });
    const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    await this.queues.enqueueProcessReminder(
      { tenantId, reminderId: reminder.id },
      delay > 0 ? delay : undefined,
    );
  }

  async processReminder(job: Job<ProcessReminderJobPayload>): Promise<void> {
    const { tenantId, reminderId } = job.data;
    const reminder = await this.prisma.appointmentReminder.findFirst({
      where: { id: reminderId, appointment: { tenantId } },
      include: {
        appointment: {
          include: { customer: { select: { email: true } } },
        },
      },
    });
    if (!reminder || reminder.sent) {
      return;
    }
    const appt = reminder.appointment;
    if (appt.status !== 'CONFIRMED') {
      return;
    }
    await this.mailer.send({
      tenantId,
      to: appt.customer.email,
      template: 'appointment-reminder',
      context: {
        title: appt.title,
        startTime: appt.startTime.toISOString(),
        appointmentCode: appt.appointmentCode,
      },
      dedupeKey: `email:reminder:${reminderId}`,
    });
    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: { sent: true },
    });
    this.logger.log({ reminderId, tenantId }, 'Reminder sent');
  }
}
