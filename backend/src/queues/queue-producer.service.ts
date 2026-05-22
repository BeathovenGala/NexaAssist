import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { bullmqConnectionOptions } from '../common/redis/redis-connection';
import {
  ALL_QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  PRIORITY_MAP,
  QUEUE_NAMES,
  type JobPriority,
  type QueueName,
} from './queue-names';
import type {
  AnalyticsAggregationJobPayload,
  AnalyticsInsightGenerationJobPayload,
  CampaignAiCopyJobPayload,
  CampaignAnalyticsSyncJobPayload,
  CampaignExecutionJobPayload,
  CampaignPosterJobPayload,
  CreateNotificationJobPayload,
  InventoryNotifyJobPayload,
  ProcessReminderJobPayload,
  ScheduleReminderJobPayload,
  SendEmailJobPayload,
  SeoAiRecommendationJobPayload,
  SeoPageAnalysisJobPayload,
  SeoReportExportJobPayload,
  SeoScanJobPayload,
  SystemCleanupJobPayload,
  WhatsAppCallbackJobPayload,
  WhatsAppRetryJobPayload,
  WhatsAppSendJobPayload,
} from './queue-job.types';

@Injectable()
export class QueueProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueProducerService.name);
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly config: ConfigService) {
    const connection = bullmqConnectionOptions(config);
    for (const name of ALL_QUEUE_NAMES) {
      this.queues.set(
        name,
        new Queue(name, {
          connection,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        }),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].map((q) => q.close()),
    );
  }

  getQueue(name: QueueName): Queue {
    const q = this.queues.get(name);
    if (!q) {
      throw new Error(`Unknown queue: ${name}`);
    }
    return q;
  }

  private async add<T extends { tenantId: string; priority?: JobPriority }>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: { delay?: number; priority?: JobPriority },
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    const priority = data.priority as JobPriority | undefined;
    await queue.add(jobName, data, {
      delay: opts?.delay,
      priority: opts?.priority
        ? PRIORITY_MAP[opts.priority]
        : priority
          ? PRIORITY_MAP[priority]
          : PRIORITY_MAP.NORMAL,
    });
    this.logger.debug(
      { queue: queueName, jobName, tenantId: data.tenantId },
      'Job enqueued',
    );
  }

  enqueueNotification(payload: CreateNotificationJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.notifications, 'create-notification', payload, {
      priority: (payload.priority as JobPriority) ?? 'NORMAL',
    });
  }

  enqueueEmail(payload: SendEmailJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.emails, 'send-email', payload, {
      priority: 'NORMAL',
    });
  }

  enqueueScheduleReminder(
    payload: ScheduleReminderJobPayload,
    delayMs: number,
  ): Promise<void> {
    return this.add(QUEUE_NAMES.appointments, 'schedule-reminder', payload, {
      delay: delayMs,
    });
  }

  enqueueProcessReminder(
    payload: ProcessReminderJobPayload,
    delayMs?: number,
  ): Promise<void> {
    return this.add(QUEUE_NAMES.appointments, 'process-reminder', payload, {
      delay: delayMs,
    });
  }

  enqueueInventoryNotify(payload: InventoryNotifyJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.inventory, 'inventory-notify', payload, {
      priority: payload.type === 'alert' ? 'HIGH' : 'NORMAL',
    });
  }

  enqueueSystemJob(payload: SystemCleanupJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.system, payload.action, payload, {
      priority: 'LOW',
    });
  }

  enqueueCampaignAiCopy(payload: CampaignAiCopyJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.campaigns, 'campaign-ai-copy', payload, { priority: 'NORMAL' });
  }

  enqueueCampaignPoster(payload: CampaignPosterJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.campaigns, 'campaign-poster', payload, { priority: 'LOW' });
  }

  enqueueCampaignExecution(payload: CampaignExecutionJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.campaigns, 'campaign-execution', payload, { priority: 'HIGH' });
  }

  enqueueCampaignAnalyticsSync(payload: CampaignAnalyticsSyncJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.campaigns, 'campaign-analytics-sync', payload, { priority: 'LOW' });
  }

  enqueueWhatsAppSend(payload: WhatsAppSendJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.whatsapp, 'whatsapp-send', payload, { priority: 'HIGH' });
  }

  enqueueWhatsAppRetry(payload: WhatsAppRetryJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.whatsapp, 'whatsapp-retry', payload, { priority: 'NORMAL' });
  }

  enqueueWhatsAppCallback(payload: WhatsAppCallbackJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.whatsapp, 'whatsapp-callback', payload, { priority: 'HIGH' });
  }

  enqueueSeoScan(payload: SeoScanJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.seo, 'seo-scan', payload, { priority: 'NORMAL' });
  }

  enqueueSeoPageAnalysis(payload: SeoPageAnalysisJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.seo, 'seo-page-analysis', payload, { priority: 'NORMAL' });
  }

  enqueueSeoAiRecommendation(payload: SeoAiRecommendationJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.seo, 'seo-ai-recommendation', payload, { priority: 'LOW' });
  }

  enqueueSeoReportExport(payload: SeoReportExportJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.seo, 'seo-report-export', payload, { priority: 'LOW' });
  }

  enqueueAnalyticsAggregation(payload: AnalyticsAggregationJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.analytics, 'analytics-aggregation', payload, { priority: 'LOW' });
  }

  enqueueAnalyticsInsightGeneration(payload: AnalyticsInsightGenerationJobPayload): Promise<void> {
    return this.add(QUEUE_NAMES.analytics, 'analytics-insight-generation', payload, { priority: 'LOW' });
  }
}
