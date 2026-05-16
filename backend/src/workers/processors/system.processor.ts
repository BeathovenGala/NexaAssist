import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueProducerService } from '../../queues/queue-producer.service';
import type { SystemCleanupJobPayload } from '../../queues/queue-job.types';

@Injectable()
export class SystemProcessor {
  private readonly logger = new Logger(SystemProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
  ) {}

  async process(job: Job<SystemCleanupJobPayload>): Promise<void> {
    const { action, tenantId } = job.data;

    if (action === 'cleanup-notifications') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const result = await this.prisma.notification.updateMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: NotificationStatus.READ,
          createdAt: { lt: cutoff },
        },
        data: { status: NotificationStatus.ARCHIVED },
      });
      this.logger.log({ archived: result.count }, 'Archived old notifications');
      return;
    }

    if (action === 'scan-reminders') {
      const now = new Date();
      const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);
      const due = await this.prisma.appointment.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          status: 'CONFIRMED',
          startTime: { gt: now, lte: oneHourAhead },
          reminders: { none: { sent: true } },
        },
        select: {
          id: true,
          tenantId: true,
          startTime: true,
        },
        take: 100,
      });
      for (const appt of due) {
        const reminderAt = new Date(appt.startTime.getTime() - 60 * 60 * 1000);
        const delay = Math.max(0, reminderAt.getTime() - Date.now());
        await this.queues.enqueueScheduleReminder(
          {
            tenantId: appt.tenantId,
            appointmentId: appt.id,
            scheduledAt: reminderAt.toISOString(),
          },
          delay,
        );
      }
      this.logger.log({ count: due.length }, 'Scanned appointment reminders');
    }
  }
}
