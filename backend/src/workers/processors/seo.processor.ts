import { Injectable, Logger } from '@nestjs/common';
import { SeoScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { DetectedIssue } from '../../seo/seo-analyzer.service';
import { SeoAnalyzerService } from '../../seo/seo-analyzer.service';
import { SeoCrawlerService } from '../../seo/seo-crawler.service';
import { SeoLlmAuditService } from '../../seo/seo-llm-audit.service';
import type {
  SeoAiRecommendationJobPayload,
  SeoPageAnalysisJobPayload,
  SeoReportExportJobPayload,
  SeoScanJobPayload,
} from '../../queues/queue-job.types';
import { QueueProducerService } from '../../queues/queue-producer.service';

@Injectable()
export class SeoProcessor {
  private readonly logger = new Logger(SeoProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawler: SeoCrawlerService,
    private readonly analyzer: SeoAnalyzerService,
    private readonly llmAudit: SeoLlmAuditService,
    private readonly queues: QueueProducerService,
    private readonly config: ConfigService,
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'seo-scan':
        await this.processScan(job as Job<SeoScanJobPayload>);
        break;
      case 'seo-page-analysis':
        await this.processPageAnalysis(job as Job<SeoPageAnalysisJobPayload>);
        break;
      case 'seo-ai-recommendation':
        await this.processAiRecommendation(job as Job<SeoAiRecommendationJobPayload>);
        break;
      case 'seo-report-export':
        await this.processReportExport(job as Job<SeoReportExportJobPayload>);
        break;
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown SEO job');
    }
  }

  private async processScan(job: Job<SeoScanJobPayload>): Promise<void> {
    const { tenantId, scanId, baseUrl } = job.data;

    await this.prisma.seoScan.update({
      where: { id: scanId },
      data: { status: SeoScanStatus.CRAWLING, startedAt: new Date() },
    });

    try {
      const urls = await this.crawler.discoverLinks(baseUrl, 2);

      await this.prisma.seoScan.update({
        where: { id: scanId },
        data: { status: SeoScanStatus.ANALYZING, pagesFound: urls.length },
      });

      for (const url of urls) {
        const crawled = await this.crawler.crawlPage(url);
        const issues = this.analyzer.analyze(crawled);
        // Use deterministic scores derived from actual crawl data
        const lighthouse = this.analyzer.estimateScores(crawled);

        const page = await this.prisma.seoPage.create({
          data: {
            scanId,
            url: crawled.url,
            title: crawled.title,
            metaDescription: crawled.metaDescription,
            h1: crawled.h1,
            wordCount: crawled.wordCount,
            statusCode: crawled.statusCode,
            loadTimeMs: crawled.loadTimeMs,
            issues: {
              create: issues.map((i) => ({
                type: i.type,
                severity: i.severity,
                description: i.description,
              })),
            },
            lighthouseResult: {
              create: {
                performance: lighthouse.performance,
                accessibility: lighthouse.accessibility,
                seoScore: lighthouse.seoScore,
                bestPractices: lighthouse.bestPractices,
              },
            },
          },
        });

        if (issues.length > 0) {
          await this.queues.enqueueSeoAiRecommendation({ tenantId, scanId, pageId: page.id });
        }
      }

      const totalIssues = await this.prisma.seoIssue.count({
        where: { page: { scanId } },
      });

      await this.prisma.seoScan.update({
        where: { id: scanId },
        data: {
          status: SeoScanStatus.COMPLETED,
          issuesFound: totalIssues,
          completedAt: new Date(),
        },
      });

      await this.prisma.seoReport.create({
        data: {
          scanId,
          summary: {
            pagesScanned: urls.length,
            totalIssues,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log({ scanId, pagesFound: urls.length, totalIssues }, 'SEO scan completed');
    } catch (err) {
      await this.prisma.seoScan.update({
        where: { id: scanId },
        data: { status: SeoScanStatus.FAILED },
      });
      throw err;
    }
  }

  private async processPageAnalysis(job: Job<SeoPageAnalysisJobPayload>): Promise<void> {
    const { pageId } = job.data;
    const page = await this.prisma.seoPage.findUnique({ where: { id: pageId } });
    if (!page) return;

    const crawled = await this.crawler.crawlPage(page.url);
    const issues = this.analyzer.analyze(crawled);

    await this.prisma.seoIssue.createMany({
      data: issues.map((i) => ({
        pageId,
        type: i.type,
        severity: i.severity,
        description: i.description,
      })),
      skipDuplicates: true,
    });
  }

  private async processAiRecommendation(job: Job<SeoAiRecommendationJobPayload>): Promise<void> {
    const { pageId } = job.data;

    const page = await this.prisma.seoPage.findUnique({
      where: { id: pageId },
      include: { issues: true, lighthouseResult: true },
    });
    if (!page || page.issues.length === 0) return;

    const crawled = await this.crawler.crawlPage(page.url);
    const issues: DetectedIssue[] = page.issues.map((i) => ({
      type: i.type,
      severity: i.severity,
      description: i.description,
    }));

    const scores = page.lighthouseResult
      ? {
          performance: page.lighthouseResult.performance,
          accessibility: page.lighthouseResult.accessibility,
          seoScore: page.lighthouseResult.seoScore,
          bestPractices: page.lighthouseResult.bestPractices,
        }
      : this.analyzer.estimateScores(crawled);

    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    let recommendation = '';

    if (apiKey?.trim()) {
      try {
        const model =
          this.config.get<string>('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';
        const frontendOrigin =
          this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';

        const prompt = this.llmAudit.buildStructuredAuditPrompt(
          page.url,
          crawled,
          issues,
          scores,
          'recommendations',
        );

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);

        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': frontendOrigin,
              'X-Title': 'NexaAssist SEO Recommendations',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 600,
              temperature: 0.3,
            }),
            signal: controller.signal,
          });

          if (res.ok) {
            const data = (await res.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            recommendation = data.choices?.[0]?.message?.content?.trim() ?? '';
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        this.logger.error({ err, pageId }, 'AI recommendation failed');
      }
    }

    if (!recommendation) {
      recommendation = page.issues
        .slice(0, 3)
        .map((i) => `Fix "${i.type.replace(/_/g, ' ').toLowerCase()}": ${i.description}`)
        .join(' | ');
    }

    await this.prisma.seoRecommendation.create({
      data: { pageId, aiSummary: recommendation, priority: page.issues.length },
    });
  }

  private async processReportExport(job: Job<SeoReportExportJobPayload>): Promise<void> {
    const { scanId } = job.data;

    try {
      const [scan, pages, issueGroups] = await Promise.all([
        this.prisma.seoScan.findUnique({
          where: { id: scanId },
          include: { project: { select: { name: true, baseUrl: true } } },
        }),
        this.prisma.seoPage.findMany({
          where: { scanId },
          orderBy: { createdAt: 'asc' },
          include: {
            issues: { orderBy: { severity: 'asc' } },
            lighthouseResult: true,
            recommendations: { orderBy: { priority: 'asc' }, take: 1 },
          },
        }),
        this.prisma.seoIssue.groupBy({
          by: ['severity'],
          where: { page: { scanId } },
          _count: { id: true },
        }),
      ]);

      const issuesBySeverity = issueGroups.reduce<Record<string, number>>((acc, g) => {
        acc[g.severity] = g._count.id;
        return acc;
      }, {});

      const reportPayload = {
        generatedAt: new Date().toISOString(),
        scan: {
          id: scanId,
          status: scan?.status,
          pagesFound: scan?.pagesFound ?? 0,
          issuesFound: scan?.issuesFound ?? 0,
          startedAt: scan?.startedAt,
          completedAt: scan?.completedAt,
        },
        project: {
          name: scan?.project?.name ?? null,
          baseUrl: scan?.project?.baseUrl ?? null,
        },
        summary: {
          pagesScanned: pages.length,
          issuesBySeverity,
          totalIssues: Object.values(issuesBySeverity).reduce((a, b) => a + b, 0),
          completedAt: scan?.completedAt?.toISOString() ?? new Date().toISOString(),
        },
        pages: pages.map((p) => ({
          url: p.url,
          title: p.title,
          statusCode: p.statusCode,
          loadTimeMs: p.loadTimeMs,
          wordCount: p.wordCount,
          h1: p.h1,
          lighthouse: p.lighthouseResult
            ? {
                performance: p.lighthouseResult.performance,
                accessibility: p.lighthouseResult.accessibility,
                seoScore: p.lighthouseResult.seoScore,
                bestPractices: p.lighthouseResult.bestPractices,
              }
            : null,
          issues: p.issues.map((i) => ({
            type: i.type,
            severity: i.severity,
            description: i.description,
          })),
          recommendation: p.recommendations[0]?.aiSummary ?? null,
        })),
      };

      // Serialise to plain JSON before writing to the Prisma Json field
      const summaryJson = JSON.parse(JSON.stringify(reportPayload)) as object;

      await this.prisma.seoReport.upsert({
        where: { scanId },
        update: {
          summary: summaryJson,
          reportUrl: `/api/seo/scans/${scanId}/report/download`,
        },
        create: {
          scanId,
          summary: summaryJson,
          reportUrl: `/api/seo/scans/${scanId}/report/download`,
        },
      });

      this.logger.log({ scanId, pages: pages.length }, 'SEO report export completed');
    } catch (err) {
      this.logger.error({ err, scanId }, 'SEO report export failed');
      throw err;
    }
  }
}
