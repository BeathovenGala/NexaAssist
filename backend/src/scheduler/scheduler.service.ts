import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueProducerService } from '../queues/queue-producer.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly queues: QueueProducerService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scanReminders(): Promise<void> {
    this.logger.debug('Enqueueing reminder scan');
    await this.queues.enqueueSystemJob({
      tenantId: 'platform',
      action: 'scan-reminders',
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupNotifications(): Promise<void> {
    this.logger.debug('Enqueueing notification cleanup');
    await this.queues.enqueueSystemJob({
      tenantId: 'platform',
      action: 'cleanup-notifications',
    });
  }
}
