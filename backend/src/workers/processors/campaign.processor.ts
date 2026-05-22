import { Injectable, Logger } from '@nestjs/common';
import { CampaignAssetType, ExecutionStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { CampaignAiService } from '../../campaigns/campaign-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CampaignAiCopyJobPayload,
  CampaignAnalyticsSyncJobPayload,
  CampaignExecutionJobPayload,
  CampaignPosterJobPayload,
} from '../../queues/queue-job.types';

@Injectable()
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly campaignAi: CampaignAiService,
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'campaign-ai-copy':
        await this.processAiCopy(job as Job<CampaignAiCopyJobPayload>);
        break;
      case 'campaign-poster':
        await this.processPoster(job as Job<CampaignPosterJobPayload>);
        break;
      case 'campaign-execution':
        await this.processExecution(job as Job<CampaignExecutionJobPayload>);
        break;
      case 'campaign-analytics-sync':
        await this.processAnalyticsSync(job as Job<CampaignAnalyticsSyncJobPayload>);
        break;
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown campaign job');
    }
  }

  private async processAiCopy(job: Job<CampaignAiCopyJobPayload>): Promise<void> {
    const { tenantId, campaignId, tone, targetAudience, additionalContext } = job.data;

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) return;

    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    let body = '';
    let title = '';

    if (apiKey?.trim()) {
      try {
        const model =
          this.config.get<string>('OPENROUTER_MODEL') ?? 'deepseek/deepseek-v4-flash:free';
        const prompt = `Write a compelling marketing ad copy for the following campaign:
Campaign Name: ${campaign.name}
Objective: ${campaign.objective.replace(/_/g, ' ')}
Tone: ${tone ?? 'professional'}
Target Audience: ${targetAudience ?? 'general public'}
Additional Context: ${additionalContext ?? campaign.notes ?? 'none'}

Provide a short title (max 10 words) and body text (max 150 words).
Format your response as:
TITLE: <title>
BODY: <body>`;

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
          const bodyMatch = content.match(/BODY:\s*([\s\S]+)/);
          title = titleMatch?.[1]?.trim() ?? `${campaign.name} - Promotion`;
          body = bodyMatch?.[1]?.trim() ?? content;
        }
      } catch (err) {
        this.logger.error({ err, campaignId }, 'OpenRouter AI copy failed, using fallback');
      }
    }

    if (!title) {
      title = `${campaign.name} — ${campaign.objective.replace(/_/g, ' ')}`;
      body = `Discover ${campaign.name}. ${campaign.notes ?? 'Contact us to learn more.'}`;
    }

    await this.prisma.campaignMessage.create({
      data: { campaignId, title, body, aiGenerated: true },
    });

    this.logger.log({ campaignId }, 'Campaign AI copy generated');
  }

  private async processPoster(job: Job<CampaignPosterJobPayload>): Promise<void> {
    const { tenantId, campaignId, context } = job.data;

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        messages: { where: { aiGenerated: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!campaign) return;

    const latestMessage = campaign.messages[0];
    const copySnippet = latestMessage
      ? `${latestMessage.title}\n${latestMessage.body}`.slice(0, 200)
      : undefined;

    let posterUrl: string;
    try {
      const posterResult = await this.campaignAi.generatePosterSync({
        name: campaign.name,
        copy: copySnippet,
        imageDescription: context?.trim() || undefined,
      });
      posterUrl = posterResult.posterUrl;
    } catch (err) {
      this.logger.error({ err, campaignId }, 'Campaign poster generation failed');
      throw err;
    }

    await this.prisma.campaignAsset.create({
      data: {
        campaignId,
        type: CampaignAssetType.POSTER,
        storageUrl: posterUrl,
        aiGenerated: true,
        metadata: { generated: true, source: 'campaign-ai-service' },
      },
    });

    this.logger.log({ campaignId }, 'Campaign poster generated');
  }

  private async processExecution(job: Job<CampaignExecutionJobPayload>): Promise<void> {
    const { tenantId, campaignId, executionId } = job.data;

    await this.prisma.campaignExecution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: campaignId, tenantId },
        include: { messages: { where: { approved: true }, take: 1 } },
      });
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Simulate execution — send in-app notifications to tenant users
      const users = await this.prisma.user.findMany({
        where: { tenantId },
        select: { id: true },
        take: 100,
      });

      this.logger.log(
        { campaignId, recipientCount: users.length },
        'Campaign execution simulated',
      );

      await this.prisma.campaignExecution.update({
        where: { id: executionId },
        data: { status: ExecutionStatus.COMPLETED, completedAt: new Date() },
      });

      // Update analytics
      await this.prisma.campaignAnalytics.upsert({
        where: { campaignId },
        update: { impressions: { increment: users.length } },
        create: { campaignId, impressions: users.length },
      });
    } catch (err) {
      await this.prisma.campaignExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private async processAnalyticsSync(job: Job<CampaignAnalyticsSyncJobPayload>): Promise<void> {
    const { campaignId } = job.data;
    const executions = await this.prisma.campaignExecution.count({
      where: { campaignId, status: ExecutionStatus.COMPLETED },
    });
    this.logger.debug({ campaignId, executions }, 'Campaign analytics sync');
  }
}
