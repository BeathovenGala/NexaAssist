import { Injectable, Logger } from '@nestjs/common';
import { NotificationPriority, NotificationType } from '@prisma/client';
import type { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import type { CreateNotificationJobPayload } from '../../queues/queue-job.types';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notifications: NotificationsService) {}

  async process(job: Job<CreateNotificationJobPayload>): Promise<void> {
    const data = job.data;
    if (!data.tenantId || !data.userId) {
      throw new Error('tenantId and userId required on notification job');
    }
    this.logger.log(
      { jobId: job.id, tenantId: data.tenantId, userId: data.userId },
      'Processing notification job',
    );
    await this.notifications.createForUser({
      tenantId: data.tenantId,
      userId: data.userId,
      type: data.type as NotificationType,
      title: data.title,
      message: data.message,
      priority: data.priority as NotificationPriority | undefined,
      actionUrl: data.actionUrl,
      metadata: data.metadata,
      dedupeKey: data.dedupeKey,
    });
  }
}
