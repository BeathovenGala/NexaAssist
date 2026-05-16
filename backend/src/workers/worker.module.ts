import { Module } from '@nestjs/common';
import { EmailsModule } from '../emails/emails.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../queues/queues.module';
import { AppointmentProcessor } from './processors/appointment.processor';
import { EmailProcessor } from './processors/email.processor';
import { InventoryProcessor } from './processors/inventory.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SystemProcessor } from './processors/system.processor';
import { WorkerRunnerService } from './worker-runner.service';

@Module({
  imports: [QueuesModule, NotificationsModule, EmailsModule],
  providers: [
    NotificationProcessor,
    EmailProcessor,
    AppointmentProcessor,
    InventoryProcessor,
    SystemProcessor,
    WorkerRunnerService,
  ],
})
export class WorkerModule {}
