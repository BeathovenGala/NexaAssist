import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EmailsModule } from '../emails/emails.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueuesModule } from '../queues/queues.module';
import { SeoModule } from '../seo/seo.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { AppointmentProcessor } from './processors/appointment.processor';
import { CampaignProcessor } from './processors/campaign.processor';
import { EmailProcessor } from './processors/email.processor';
import { InventoryProcessor } from './processors/inventory.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SeoProcessor } from './processors/seo.processor';
import { SystemProcessor } from './processors/system.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { WorkerRunnerService } from './worker-runner.service';

@Module({
  imports: [
    QueuesModule,
    NotificationsModule,
    EmailsModule,
    SeoModule,
    CampaignsModule,
    WhatsAppModule,
    PrismaModule,
  ],
  providers: [
    NotificationProcessor,
    EmailProcessor,
    AppointmentProcessor,
    InventoryProcessor,
    SystemProcessor,
    CampaignProcessor,
    WhatsAppProcessor,
    SeoProcessor,
    AnalyticsProcessor,
    WorkerRunnerService,
  ],
})
export class WorkerModule {}
