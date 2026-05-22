import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import {
  ALL_QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
} from '../queues/queue-names';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { AppointmentProcessor } from './processors/appointment.processor';
import { CampaignProcessor } from './processors/campaign.processor';
import { EmailProcessor } from './processors/email.processor';
import { InventoryProcessor } from './processors/inventory.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SeoProcessor } from './processors/seo.processor';
import { SystemProcessor } from './processors/system.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';

@Injectable()
export class WorkerRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerRunnerService.name);
  private workers: Worker[] = [];
  private heartbeatRedis: Redis | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notificationProcessor: NotificationProcessor,
    private readonly emailProcessor: EmailProcessor,
    private readonly appointmentProcessor: AppointmentProcessor,
    private readonly inventoryProcessor: InventoryProcessor,
    private readonly systemProcessor: SystemProcessor,
    private readonly campaignProcessor: CampaignProcessor,
    private readonly whatsappProcessor: WhatsAppProcessor,
    private readonly seoProcessor: SeoProcessor,
    private readonly analyticsProcessor: AnalyticsProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.config.get<string>('WORKER_ENABLED') !== 'false';
    if (!enabled) {
      this.logger.warn('WORKER_ENABLED=false — skipping worker registration');
      return;
    }

    const redisUrl =
      this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const connection = { url: redisUrl };

    const workerOpts = {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    };

    this.workers.push(
      new Worker(
        QUEUE_NAMES.notifications,
        async (job) => this.notificationProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.emails,
        async (job) => this.emailProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.appointments,
        async (job) => {
          if (job.name === 'schedule-reminder') {
            await this.appointmentProcessor.processScheduleReminder(job);
          } else {
            await this.appointmentProcessor.processReminder(job);
          }
        },
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.inventory,
        async (job) => this.inventoryProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.system,
        async (job) => this.systemProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.campaigns,
        async (job) => this.campaignProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.whatsapp,
        async (job) => this.whatsappProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.seo,
        async (job) => this.seoProcessor.process(job),
        workerOpts,
      ),
      new Worker(
        QUEUE_NAMES.analytics,
        async (job) => this.analyticsProcessor.process(job),
        workerOpts,
      ),
    );

    for (const w of this.workers) {
      w.on('failed', (job, err) => {
        this.logger.error(
          { jobId: job?.id, queue: w.name, err: err.message },
          'Job failed',
        );
      });
      w.on('completed', (job) => {
        this.logger.debug({ jobId: job.id, queue: w.name }, 'Job completed');
      });
    }

    this.heartbeatRedis = new Redis(redisUrl);
    this.heartbeatTimer = setInterval(() => {
      void this.heartbeatRedis?.set(
        'nexaassist:worker:heartbeat',
        new Date().toISOString(),
        'EX',
        60,
      );
    }, 15_000);

    this.logger.log(
      { queues: ALL_QUEUE_NAMES },
      'Background workers started',
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    await this.heartbeatRedis?.quit();
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
