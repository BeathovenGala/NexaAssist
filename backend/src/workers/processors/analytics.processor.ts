import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsModule } from '@prisma/client';
import type { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AnalyticsAggregationJobPayload,
  AnalyticsInsightGenerationJobPayload,
} from '../../queues/queue-job.types';

@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'analytics-aggregation':
        await this.processAggregation(job as Job<AnalyticsAggregationJobPayload>);
        break;
      case 'analytics-insight-generation':
        await this.processInsightGeneration(job as Job<AnalyticsInsightGenerationJobPayload>);
        break;
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown analytics job');
    }
  }

  private async processAggregation(job: Job<AnalyticsAggregationJobPayload>): Promise<void> {
    const { tenantId, date } = job.data;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    this.logger.log({ tenantId, date: targetDate.toISOString() }, 'Running analytics aggregation');

    // Aggregate appointment metrics
    const [
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
    ] = await Promise.all([
      this.prisma.appointment.count({ where: { tenantId } }),
      this.prisma.appointment.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.appointment.count({ where: { tenantId, status: 'CANCELLED' } }),
    ]);

    await this.upsertMetric(tenantId, AnalyticsModule.APPOINTMENTS, 'total', totalAppointments, targetDate);
    await this.upsertMetric(tenantId, AnalyticsModule.APPOINTMENTS, 'completed', completedAppointments, targetDate);
    await this.upsertMetric(tenantId, AnalyticsModule.APPOINTMENTS, 'cancelled', cancelledAppointments, targetDate);

    // Aggregate inventory metrics
    const [totalItems, lowStockItems] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { tenantId, isActive: true } }),
      this.prisma.inventoryItem.count({ where: { tenantId, status: 'LOW' } }),
    ]);

    await this.upsertMetric(tenantId, AnalyticsModule.INVENTORY, 'total_items', totalItems, targetDate);
    await this.upsertMetric(tenantId, AnalyticsModule.INVENTORY, 'low_stock', lowStockItems, targetDate);

    // Aggregate campaign metrics
    const [totalCampaigns, activeCampaigns] = await Promise.all([
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.campaign.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    await this.upsertMetric(tenantId, AnalyticsModule.CAMPAIGNS, 'total', totalCampaigns, targetDate);
    await this.upsertMetric(tenantId, AnalyticsModule.CAMPAIGNS, 'active', activeCampaigns, targetDate);

    // Aggregate WhatsApp metrics
    const [totalBatches, totalMessages] = await Promise.all([
      this.prisma.whatsAppBatch.count({ where: { tenantId } }),
      this.prisma.whatsAppMessage.count({ where: { batch: { tenantId } } }),
    ]);

    await this.upsertMetric(tenantId, AnalyticsModule.WHATSAPP, 'total_batches', totalBatches, targetDate);
    await this.upsertMetric(tenantId, AnalyticsModule.WHATSAPP, 'total_messages', totalMessages, targetDate);

    // Create snapshot
    await this.prisma.analyticsSnapshot.create({
      data: {
        tenantId,
        module: AnalyticsModule.GENERAL,
        snapshotJson: {
          date: targetDate.toISOString(),
          appointments: { total: totalAppointments, completed: completedAppointments },
          inventory: { total: totalItems, lowStock: lowStockItems },
          campaigns: { total: totalCampaigns, active: activeCampaigns },
          whatsapp: { batches: totalBatches, messages: totalMessages },
        },
      },
    });

    this.logger.log({ tenantId }, 'Analytics aggregation completed');
  }

  private async processInsightGeneration(
    job: Job<AnalyticsInsightGenerationJobPayload>,
  ): Promise<void> {
    const { tenantId, module } = job.data;
    const targetModule = module ? (module as AnalyticsModule) : AnalyticsModule.GENERAL;

    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    let insight = '';
    let title = '';

    // Get recent metrics for context
    const metrics = await this.prisma.analyticsDailyMetric.findMany({
      where: { tenantId, module: targetModule },
      orderBy: { date: 'desc' },
      take: 10,
    });

    if (apiKey?.trim() && metrics.length > 0) {
      try {
        const model =
          this.config.get<string>('OPENROUTER_MODEL') ?? 'deepseek/deepseek-v4-flash:free';
        const metricsText = metrics
          .map((m) => `${m.metric}: ${m.value} (${m.date.toISOString().split('T')[0]})`)
          .join('\n');

        const prompt = `Based on these ${targetModule.toLowerCase()} metrics for a healthcare business, provide 1 actionable insight (max 100 words):\n${metricsText}\n\nFormat:\nTITLE: <short title>\nINSIGHT: <actionable insight>`;

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = data.choices?.[0]?.message?.content ?? '';
          const titleMatch = content.match(/TITLE:\s*(.+)/);
          const insightMatch = content.match(/INSIGHT:\s*([\s\S]+)/);
          title = titleMatch?.[1]?.trim() ?? `${targetModule} Insight`;
          insight = insightMatch?.[1]?.trim() ?? content;
        }
      } catch (err) {
        this.logger.error({ err, tenantId }, 'AI insight generation failed');
      }
    }

    if (!insight) {
      title = `${targetModule} Summary`;
      insight = `Your ${targetModule.toLowerCase()} data shows ${metrics.length} data points tracked. Review trends regularly for optimization opportunities.`;
    }

    await this.prisma.analyticsInsight.create({
      data: { tenantId, module: targetModule, title, insight },
    });

    this.logger.log({ tenantId, module: targetModule }, 'Analytics insight generated');
  }

  private async upsertMetric(
    tenantId: string,
    module: AnalyticsModule,
    metric: string,
    value: number,
    date: Date,
  ): Promise<void> {
    await this.prisma.analyticsDailyMetric.upsert({
      where: { tenantId_module_metric_date: { tenantId, module, metric, date } },
      update: { value },
      create: { tenantId, module, metric, value, date },
    });
  }
}
