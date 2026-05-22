import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SeoIssueSeverity, SeoIssueType, SeoScanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import type { EstimatedScores } from './seo-analyzer.service';
import type { CrawledPage } from './seo-crawler.service';
import type { QuickAuditResult } from './seo-audit.types';
import { auditOrigin, hostnameFromUrl, normalizeAuditUrl } from './seo-url.util';
import type {
  CompareScanDto,
  CreateSeoProjectDto,
  SeoIssueFilterDto,
  SeoPageFilterDto,
  UpdateSeoProjectDto,
} from './dto/seo.dto';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
  ) {}

  async createProject(tenantId: string, dto: CreateSeoProjectDto) {
    const baseUrl = normalizeAuditUrl(dto.baseUrl);
    return this.prisma.seoProject.create({
      data: { tenantId, name: dto.name, baseUrl: auditOrigin(baseUrl) },
    });
  }

  /**
   * Persist a synchronous quick-audit (crawl + LLM) so results appear in projects/scans/stats.
   */
  async saveQuickAudit(
    tenantId: string,
    inputUrl: string,
    audit: QuickAuditResult,
    crawled: CrawledPage,
    scores: EstimatedScores,
  ): Promise<{ projectId: string; scanId: string }> {
    const pageUrl = normalizeAuditUrl(inputUrl);
    const origin = auditOrigin(pageUrl);
    const host = hostnameFromUrl(pageUrl);

    let project = await this.prisma.seoProject.findFirst({
      where: { tenantId, baseUrl: origin },
    });

    if (!project) {
      project = await this.prisma.seoProject.create({
        data: { tenantId, name: host, baseUrl: origin },
      });
    }

    const now = new Date();
    const issueCount = audit.issues.length;

    const scan = await this.prisma.seoScan.create({
      data: {
        projectId: project.id,
        status: SeoScanStatus.COMPLETED,
        pagesFound: 1,
        issuesFound: issueCount,
        startedAt: now,
        completedAt: now,
      },
    });

    const seoPage = await this.prisma.seoPage.create({
      data: {
        scanId: scan.id,
        url: crawled.url || pageUrl,
        title: crawled.title,
        metaDescription: crawled.metaDescription,
        h1: crawled.h1,
        wordCount: crawled.wordCount,
        statusCode: crawled.statusCode,
        loadTimeMs: crawled.loadTimeMs,
        issues: {
          create: audit.issues.map((issue) => ({
            type: issue.type as SeoIssueType,
            severity: issue.severity as SeoIssueSeverity,
            description: issue.description,
          })),
        },
        lighthouseResult: {
          create: {
            performance: scores.performance,
            accessibility: scores.accessibility,
            seoScore: scores.seoScore,
            bestPractices: scores.bestPractices,
            rawResultJson: {
              overallScore: audit.overallScore,
              categories: audit.categories,
              whatIsGood: audit.whatIsGood,
              whatToFix: audit.whatToFix,
              summary: audit.summary,
              crawledAt: audit.crawledAt,
              crawlSucceeded: crawled.statusCode > 0 && crawled.statusCode < 400,
            },
          },
        },
        recommendations: {
          create: {
            aiSummary: audit.summary,
            priority: Math.max(1, issueCount),
          },
        },
      },
    });

    const reportSummary = JSON.parse(
      JSON.stringify({
        type: 'quick_audit',
        url: audit.url,
        pageId: seoPage.id,
        overallScore: audit.overallScore,
        categories: audit.categories,
        issues: audit.issues,
        whatIsGood: audit.whatIsGood,
        whatToFix: audit.whatToFix,
        summary: audit.summary,
        crawledAt: audit.crawledAt,
        extractedPage: this.serializeCrawledPageForStorage(crawled),
      }),
    ) as object;

    await this.prisma.seoReport.create({
      data: {
        scanId: scan.id,
        reportUrl: `/api/seo/scans/${scan.id}/report/download`,
        summary: reportSummary,
      },
    });

    this.logger.log(
      { tenantId, projectId: project.id, scanId: scan.id, url: pageUrl },
      'Quick SEO audit saved',
    );

    return { projectId: project.id, scanId: scan.id };
  }

  private serializeCrawledPageForStorage(page: CrawledPage): Record<string, unknown> {
    return {
      url: page.url,
      statusCode: page.statusCode,
      loadTimeMs: page.loadTimeMs,
      title: page.title,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      canonicalUrl: page.canonicalUrl,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      h1: page.h1,
      h1s: page.h1s,
      h2s: page.h2s,
      wordCount: page.wordCount,
      totalImages: page.totalImages,
      missingAltCount: page.missingAltCount,
      internalLinkCount: page.internalLinkCount,
      externalLinkCount: page.externalLinkCount,
      hasSchemaMarkup: page.hasSchemaMarkup,
      bodyPreview: page.bodyText?.slice(0, 800) ?? null,
    };
  }

  async findProjects(tenantId: string) {
    const projects = await this.prisma.seoProject.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { scans: true } } },
    });

    return Promise.all(
      projects.map(async (project) => {
        const latestScan = await this.prisma.seoScan.findFirst({
          where: { projectId: project.id, status: SeoScanStatus.COMPLETED },
          orderBy: { completedAt: 'desc' },
          include: {
            pages: { include: { lighthouseResult: true } },
          },
        });

        let issueCount = 0;
        let avgScore: number | null = null;
        let lastScanAt: string | null = null;
        let lastScanId: string | null = null;

        if (latestScan) {
          lastScanId = latestScan.id;
          lastScanAt = (
            latestScan.completedAt ?? latestScan.createdAt
          ).toISOString();
          issueCount = latestScan.issuesFound;

          const scores = latestScan.pages
            .map((p) => p.lighthouseResult?.seoScore)
            .filter((s): s is number => s != null);
          if (scores.length > 0) {
            avgScore = Math.round(
              scores.reduce((sum, s) => sum + s, 0) / scores.length,
            );
          }
        }

        return {
          ...project,
          issueCount,
          avgScore,
          lastScanAt,
          lastScanId,
        };
      }),
    );
  }

  async findProject(tenantId: string, id: string) {
    const project = await this.prisma.seoProject.findFirst({
      where: { id, tenantId },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, status: true, pagesFound: true, issuesFound: true, createdAt: true },
        },
      },
    });
    if (!project) throw new NotFoundException('SEO project not found');
    return project;
  }

  async triggerScan(tenantId: string, projectId: string) {
    const project = await this.prisma.seoProject.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('SEO project not found');

    const scan = await this.prisma.seoScan.create({
      data: { projectId, status: SeoScanStatus.QUEUED },
    });

    await this.queues.enqueueSeoScan({
      tenantId,
      scanId: scan.id,
      projectId,
      baseUrl: project.baseUrl,
    });

    return scan;
  }

  async getScanStatus(tenantId: string, scanId: string) {
    const scan = await this.prisma.seoScan.findFirst({
      where: { id: scanId, project: { tenantId } },
      include: {
        project: { select: { name: true, baseUrl: true } },
        _count: { select: { pages: true } },
      },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  async getPages(tenantId: string, scanId: string, filter: SeoPageFilterDto) {
    await this.assertScanAccess(tenantId, scanId);
    const page = parseInt(filter.page ?? '1', 10);
    const limit = parseInt(filter.limit ?? '20', 10);

    const [pages, total] = await Promise.all([
      this.prisma.seoPage.findMany({
        where: { scanId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { issues: true } },
          lighthouseResult: true,
        },
      }),
      this.prisma.seoPage.count({ where: { scanId } }),
    ]);

    return { pages, total, page, limit };
  }

  async getIssues(tenantId: string, scanId: string, filter: SeoIssueFilterDto) {
    await this.assertScanAccess(tenantId, scanId);
    const page = parseInt(filter.page ?? '1', 10);
    const limit = parseInt(filter.limit ?? '50', 10);

    const where: Record<string, unknown> = { page: { scanId } };
    if (filter.severity) where.severity = filter.severity;
    if (filter.type) where.type = filter.type;

    const [issues, total] = await Promise.all([
      this.prisma.seoIssue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        include: { page: { select: { url: true } } },
      }),
      this.prisma.seoIssue.count({ where }),
    ]);

    return { issues, total, page, limit };
  }

  async getRecommendations(tenantId: string, scanId: string) {
    await this.assertScanAccess(tenantId, scanId);
    return this.prisma.seoRecommendation.findMany({
      where: { page: { scanId } },
      orderBy: { priority: 'asc' },
      include: { page: { select: { url: true } } },
    });
  }

  async getReport(tenantId: string, scanId: string) {
    await this.assertScanAccess(tenantId, scanId);

    const [scan, report, issuesBySeverity] = await Promise.all([
      this.prisma.seoScan.findUnique({
        where: { id: scanId },
        include: { project: true },
      }),
      this.prisma.seoReport.findUnique({ where: { scanId } }),
      this.prisma.seoIssue.groupBy({
        by: ['severity'],
        where: { page: { scanId } },
        _count: true,
      }),
    ]);

    return { scan, report, issuesBySeverity };
  }

  async compareScans(tenantId: string, dto: CompareScanDto) {
    const [scan1, scan2] = await Promise.all([
      this.assertScanAccess(tenantId, dto.scanId1),
      this.assertScanAccess(tenantId, dto.scanId2),
    ]);

    const [issues1, issues2] = await Promise.all([
      this.prisma.seoIssue.count({ where: { page: { scanId: dto.scanId1 } } }),
      this.prisma.seoIssue.count({ where: { page: { scanId: dto.scanId2 } } }),
    ]);

    return {
      scan1: { id: dto.scanId1, issuesFound: scan1.issuesFound, pagesFound: scan1.pagesFound },
      scan2: { id: dto.scanId2, issuesFound: scan2.issuesFound, pagesFound: scan2.pagesFound },
      issuesDelta: issues2 - issues1,
      improved: issues2 < issues1,
    };
  }

  async getScanHistory(tenantId: string, projectId: string) {
    const project = await this.prisma.seoProject.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.seoScan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        pagesFound: true,
        issuesFound: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, scansThisMonth, issuesFound, avgScoreResult] = await Promise.all([
      this.prisma.seoProject.count({ where: { tenantId } }),
      this.prisma.seoScan.count({
        where: { project: { tenantId }, createdAt: { gte: firstOfMonth } },
      }),
      this.prisma.seoIssue.count({
        where: { page: { scan: { project: { tenantId } } } },
      }),
      this.prisma.seoLighthouseResult.aggregate({
        where: { page: { scan: { project: { tenantId } } } },
        _avg: { seoScore: true },
      }),
    ]);

    return {
      total,
      scansThisMonth,
      issuesFound,
      avgScore: avgScoreResult._avg.seoScore ?? null,
    };
  }

  async exportReport(tenantId: string, scanId: string) {
    await this.assertScanAccess(tenantId, scanId);
    await this.queues.enqueueSeoReportExport({ tenantId, scanId });
    return { queued: true, scanId };
  }

  async downloadReport(tenantId: string, scanId: string) {
    await this.assertScanAccess(tenantId, scanId);

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

    if (!scan) throw new NotFoundException('Scan not found');

    const issuesBySeverity = issueGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.severity] = g._count.id;
      return acc;
    }, {});

    return {
      generatedAt: new Date().toISOString(),
      scan: {
        id: scanId,
        status: scan.status,
        pagesFound: scan.pagesFound ?? 0,
        issuesFound: scan.issuesFound ?? 0,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
      },
      project: {
        name: scan.project?.name ?? null,
        baseUrl: scan.project?.baseUrl ?? null,
      },
      summary: {
        pagesScanned: pages.length,
        issuesBySeverity,
        totalIssues: Object.values(issuesBySeverity).reduce((a, b) => a + b, 0),
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
  }

  private async assertScanAccess(tenantId: string, scanId: string) {
    const scan = await this.prisma.seoScan.findFirst({
      where: { id: scanId, project: { tenantId } },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }
}
