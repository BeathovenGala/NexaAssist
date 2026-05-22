import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeoIssueSeverity } from '@prisma/client';
import type { DetectedIssue, EstimatedScores } from './seo-analyzer.service';
import { SeoAnalyzerService } from './seo-analyzer.service';
import type { CrawledPage } from './seo-crawler.service';
import { SeoCrawlerService } from './seo-crawler.service';
import type { QuickAuditResult } from './seo-audit.types';
import { SeoService } from './seo.service';
import { normalizeAuditUrl } from './seo-url.util';

export type { QuickAuditResult } from './seo-audit.types';

type AiAuditPayload = {
  categories: { technicalSeo: number; content: number; performance: number; ux: number };
  whatIsGood: string[];
  whatToFix: Array<{ title: string; severity: string; detail: string; fix: string }>;
  summary: string;
};

@Injectable()
export class SeoLlmAuditService {
  private readonly logger = new Logger(SeoLlmAuditService.name);

  constructor(
    private readonly crawler: SeoCrawlerService,
    private readonly analyzer: SeoAnalyzerService,
    private readonly seoService: SeoService,
    private readonly config: ConfigService,
  ) {}

  async quickAudit(url: string, tenantId: string): Promise<QuickAuditResult> {
    const normalizedUrl = normalizeAuditUrl(url);
    const crawledAt = new Date();

    let page: CrawledPage;
    try {
      page = await this.crawler.crawlPage(normalizedUrl);
    } catch (err) {
      this.logger.warn({ url, err }, 'Crawl failed, using empty page for LLM-only analysis');
      page = {
        url: normalizedUrl,
        statusCode: 0,
        title: null,
        metaDescription: null,
        metaKeywords: null,
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        h1: null,
        h1s: [],
        h2s: [],
        bodyText: null,
        wordCount: 0,
        links: [],
        internalLinkCount: 0,
        externalLinkCount: 0,
        totalImages: 0,
        missingAltCount: 0,
        hasSchemaMarkup: false,
        loadTimeMs: 0,
      };
    }

    const issues = this.analyzer.analyze(page);
    const scores = this.analyzer.estimateScores(page);
    const overallScore = this.calculateScore(issues);
    const crawlSucceeded = page.statusCode > 0 && page.statusCode < 400 && page.wordCount > 0;
    const aiResult = await this.callOpenRouter(normalizedUrl, page, issues, scores);

    const audit: QuickAuditResult = {
      url: normalizedUrl,
      projectId: '',
      scanId: '',
      crawlSucceeded,
      overallScore,
      categories: aiResult.categories,
      issues,
      whatIsGood: aiResult.whatIsGood,
      whatToFix: aiResult.whatToFix,
      summary: aiResult.summary,
      crawledAt,
    };

    const saved = await this.seoService.saveQuickAudit(tenantId, normalizedUrl, audit, page, scores);
    audit.projectId = saved.projectId;
    audit.scanId = saved.scanId;

    return audit;
  }

  /** Structured crawl payload sent to the LLM (must differ per URL). */
  serializePageForLlm(page: CrawledPage): Record<string, unknown> {
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
      h2s: page.h2s.slice(0, 12),
      wordCount: page.wordCount,
      totalImages: page.totalImages,
      missingAltCount: page.missingAltCount,
      internalLinkCount: page.internalLinkCount,
      externalLinkCount: page.externalLinkCount,
      hasSchemaMarkup: page.hasSchemaMarkup,
      bodyPreview: page.bodyText?.slice(0, 800) ?? null,
    };
  }

  /** Rich crawl-based prompt shared by quick audit and background recommendation jobs. */
  buildStructuredAuditPrompt(
    url: string,
    page: CrawledPage,
    issues: DetectedIssue[],
    scores: EstimatedScores,
    mode: 'json_audit' | 'recommendations',
  ): string {
    const issueList = issues.length
      ? issues.map((i) => `- [${i.severity}] ${i.type}: ${i.description}`).join('\n')
      : 'No issues detected.';

    const pageDataSection = this.formatPageDataSection(page);

    const scoresSection = `--- Estimated SEO Signals (derived from crawl data) ---
Performance Score: ${scores.performance}/100 (based on ${page.loadTimeMs > 0 ? `${page.loadTimeMs}ms load time` : 'unknown load time'})
Accessibility Score: ${scores.accessibility}/100
SEO Score: ${scores.seoScore}/100 (based on metadata completeness)
Best Practices Score: ${scores.bestPractices}/100`;

    const extractedJson = JSON.stringify(this.serializePageForLlm(page), null, 2);

    const sharedContext = `TARGET URL (must tailor every recommendation to this exact page): ${url}

=== EXTRACTED PAGE DATA (JSON — primary source of truth) ===
${extractedJson}

=== PAGE DATA (human-readable) ===
${pageDataSection}

--- Automated Issue Scan Results ---
${issueList}

${scoresSection}`;

    if (mode === 'recommendations') {
      return `You are an expert SEO auditor. Analyze the structured page data below and provide concrete, actionable recommendations specific to THIS URL. Reference the actual title, headings, image alt metrics, word count, and detected issues — do not give generic advice.

${sharedContext}

=== YOUR TASK ===
Write prioritized recommendations (max 250 words) covering technical SEO, content, performance, and accessibility for this exact page. Reference the domain and specific missing elements from the data above.`;
    }

    return `You are an expert SEO auditor. Analyze the specific URL below and produce a detailed, page-specific SEO audit in JSON. Your response MUST reference the actual content, domain, metadata, and issues for THIS exact URL — do not give generic advice that applies to any website.

${sharedContext}

=== YOUR TASK ===
Write a comprehensive SEO audit covering all four areas below. Be SPECIFIC to this page — reference the actual title, URL path, domain name, content topics, and detected issues. Generic advice that could apply to any site is not acceptable.

1. Technical SEO: Evaluate meta tags, canonicals, structured data, HTTPS, redirects, indexability
2. Content Quality: Assess the title tag, meta description, headings, word count, topical relevance
3. Performance: Address load speed, Core Web Vitals implications, optimization opportunities  
4. UX & Accessibility: Mobile-friendliness expectations, readability, navigation signals

Return ONLY valid JSON (no markdown, no extra text):
{
  "categories": {
    "technicalSeo": <integer 0-100>,
    "content": <integer 0-100>,
    "performance": <integer 0-100>,
    "ux": <integer 0-100>
  },
  "whatIsGood": [
    "<specific strength observed or confidently inferred for THIS page>",
    ...
  ],
  "whatToFix": [
    {
      "title": "<specific issue title>",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "detail": "<explanation specific to this exact URL, page type, and domain>",
      "fix": "<concrete, step-by-step fix — not generic advice>"
    }
  ],
  "summary": "<2-3 sentence paragraph about THIS page's SEO health, referencing the domain/title/content, with top priorities>"
}`;
  }

  private formatPageDataSection(page: CrawledPage): string {
    const h2List = page.h2s.length
      ? page.h2s.slice(0, 6).map((h) => `  • ${h}`).join('\n')
      : '  None found';

    const h1List =
      page.h1s.length > 1
        ? page.h1s.map((h) => `  • ${h}`).join('\n')
        : page.h1 ?? 'MISSING — important SEO issue';

    if (page.statusCode === 0) {
      return `Note: The page could not be fetched (likely bot-blocking or network error). Use your SEO expertise to analyze the URL structure, domain, and infer likely issues for this type of website.`;
    }

    return `HTTP Status: ${page.statusCode}
Page Load Time: ${page.loadTimeMs}ms

--- Metadata ---
Title: ${page.title ?? 'MISSING — critical SEO issue'}
Meta Description: ${page.metaDescription ?? 'MISSING — critical SEO issue'}
${page.metaKeywords ? `Meta Keywords: ${page.metaKeywords}` : 'Meta Keywords: Not set'}
Canonical URL: ${page.canonicalUrl ?? 'NOT SET — duplicate content risk'}
OG Title: ${page.ogTitle ?? 'Not set'}
OG Description: ${page.ogDescription ?? 'Not set'}
Schema Markup: ${page.hasSchemaMarkup ? 'Present (JSON-LD or Microdata detected)' : 'NOT detected — missing rich result opportunity'}

--- Content Structure ---
H1: ${typeof h1List === 'string' ? h1List : `Multiple H1s:\n${h1List}`}
H2 Headings:
${h2List}
Word Count: ${page.wordCount} words
Images: ${page.totalImages} total, ${page.missingAltCount} missing alt text
Internal Links: ${page.internalLinkCount}
External Links: ${page.externalLinkCount}

--- Page Content Preview ---
${page.bodyText ? page.bodyText.slice(0, 600) : 'Could not extract page content'}`;
  }

  private calculateScore(issues: DetectedIssue[]): number {
    const criticalCount = issues.filter((i) => i.severity === SeoIssueSeverity.CRITICAL).length;
    const highCount = issues.filter((i) => i.severity === SeoIssueSeverity.HIGH).length;
    const mediumCount = issues.filter((i) => i.severity === SeoIssueSeverity.MEDIUM).length;
    const lowCount = issues.filter((i) => i.severity === SeoIssueSeverity.LOW).length;

    const criticalDeduction = Math.min(criticalCount * 10, 40);
    const highDeduction = Math.min(highCount * 5, 25);
    const mediumDeduction = Math.min(mediumCount * 2, 10);
    const lowDeduction = Math.min(lowCount * 1, 5);

    return Math.max(0, 100 - criticalDeduction - highDeduction - mediumDeduction - lowDeduction);
  }

  private async callOpenRouter(
    url: string,
    page: CrawledPage,
    issues: DetectedIssue[],
    scores: EstimatedScores,
  ): Promise<AiAuditPayload> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn('OPENROUTER_API_KEY not configured, returning fallback audit result');
      return this.fallbackResult(page, issues, scores);
    }

    const model =
      this.config.get<string>('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';
    const frontendOrigin =
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';

    const prompt = this.buildStructuredAuditPrompt(url, page, issues, scores, 'json_audit');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': frontendOrigin,
          'X-Title': 'NexaAssist SEO Auditor',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an SEO auditor. You receive the exact URL and extracted HTML metrics as JSON. ' +
                'Every field in your JSON response must be specific to that URL and extracted data. ' +
                'Never output generic SEO advice that could apply to any website. Return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.35,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OpenRouter SEO audit error ${res.status}: ${text.slice(0, 300)}`);
        return this.fallbackResult(page, issues, scores);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        this.logger.warn('Empty OpenRouter response for SEO audit');
        return this.fallbackResult(page, issues, scores);
      }

      return this.parseAiResponse(content, page, issues, scores);
    } catch (err) {
      this.logger.warn({ err }, 'OpenRouter SEO audit call failed, using fallback');
      return this.fallbackResult(page, issues, scores);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseAiResponse(
    content: string,
    page: CrawledPage,
    issues: DetectedIssue[],
    scores: EstimatedScores,
  ): AiAuditPayload {
    try {
      const parsed = JSON.parse(content) as {
        categories?: {
          technicalSeo?: unknown;
          content?: unknown;
          performance?: unknown;
          ux?: unknown;
        };
        whatIsGood?: unknown;
        whatToFix?: unknown;
        summary?: unknown;
      };

      return {
        categories: {
          technicalSeo: this.toScore(parsed.categories?.technicalSeo, scores.seoScore),
          content: this.toScore(parsed.categories?.content, this.estimateContentScore(page)),
          performance: this.toScore(parsed.categories?.performance, scores.performance),
          ux: this.toScore(parsed.categories?.ux, scores.accessibility),
        },
        whatIsGood: Array.isArray(parsed.whatIsGood)
          ? (parsed.whatIsGood as string[]).filter((s) => typeof s === 'string')
          : this.buildWhatIsGood(page),
        whatToFix: Array.isArray(parsed.whatToFix)
          ? (parsed.whatToFix as Array<Record<string, unknown>>).map((item) => ({
              title: typeof item.title === 'string' ? item.title : '',
              severity: typeof item.severity === 'string' ? item.severity : 'MEDIUM',
              detail: typeof item.detail === 'string' ? item.detail : '',
              fix: typeof item.fix === 'string' ? item.fix : '',
            }))
          : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : this.buildFallbackSummary(page, issues),
      };
    } catch {
      this.logger.warn('Failed to parse AI JSON response, using fallback');
      return this.fallbackResult(page, issues, scores);
    }
  }

  private fallbackResult(
    page: CrawledPage,
    issues: DetectedIssue[],
    scores: EstimatedScores,
  ): AiAuditPayload {
    return {
      categories: {
        technicalSeo: scores.seoScore,
        content: this.estimateContentScore(page),
        performance: scores.performance,
        ux: scores.accessibility,
      },
      whatIsGood: this.buildWhatIsGood(page),
      whatToFix: issues.slice(0, 6).map((i) => ({
        title: i.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        severity: i.severity,
        detail: i.description,
        fix: this.fixSuggestionForType(i.type),
      })),
      summary: this.buildFallbackSummary(page, issues),
    };
  }

  /** Compute a content quality score from actual crawl data — no random values. */
  private estimateContentScore(page: CrawledPage): number {
    let score = 100;
    if (!page.title) score -= 25;
    else if (page.title.length < 10 || page.title.length > 70) score -= 10;
    if (!page.metaDescription) score -= 20;
    if (!page.h1) score -= 15;
    if (page.wordCount < 100) score -= 20;
    else if (page.wordCount < 300) score -= 10;
    if (page.h2s.length === 0) score -= 5;
    return Math.max(0, score);
  }

  /** Build a list of observed positives from real crawl data. */
  private buildWhatIsGood(page: CrawledPage): string[] {
    const good: string[] = [];
    if (page.title) good.push(`Title tag is present: "${page.title.slice(0, 60)}${page.title.length > 60 ? '…' : ''}"`);
    if (page.metaDescription) good.push(`Meta description is set (${page.metaDescription.length} chars)`);
    if (page.h1) good.push(`H1 heading found: "${page.h1.slice(0, 60)}${page.h1.length > 60 ? '…' : ''}"`);
    if (page.h2s.length > 0) good.push(`${page.h2s.length} H2 heading(s) structure the content`);
    if (page.hasSchemaMarkup) good.push('Structured data (Schema.org / JSON-LD) is implemented');
    if (page.canonicalUrl) good.push(`Canonical URL is specified: ${page.canonicalUrl}`);
    if (page.ogTitle) good.push('Open Graph title is set for social sharing');
    if (page.loadTimeMs > 0 && page.loadTimeMs < 2000) good.push(`Fast page load time: ${page.loadTimeMs}ms`);
    if (page.internalLinkCount > 3) good.push(`${page.internalLinkCount} internal links help search engine crawling`);
    if (page.wordCount >= 300) good.push(`Sufficient content length: ${page.wordCount} words`);
    if (page.url.startsWith('https')) good.push('Page is served over HTTPS (secure connection)');
    return good.length ? good : ['Page is accessible and returned a valid response'];
  }

  /** Return a concrete, issue-type-specific fix hint. */
  private fixSuggestionForType(type: string): string {
    const fixes: Record<string, string> = {
      MISSING_TITLE: 'Add a <title> tag inside <head> with 10–70 characters describing the page topic and primary keyword.',
      MISSING_META_DESCRIPTION: 'Add <meta name="description" content="..."> with 50–160 characters summarizing the page for searchers.',
      MISSING_H1: 'Add one <h1> tag containing the main topic/keyword of the page. Do not use more than one H1.',
      SLOW_PAGE_SPEED: 'Compress and lazy-load images, minify CSS/JS, enable server-side caching, and consider a CDN.',
      BROKEN_LINK: 'Fix or redirect the URL to a working page. Use a 301 permanent redirect if the content has moved.',
      DUPLICATE_CONTENT: 'Expand the content to at least 300 words covering the topic in depth, or use a canonical tag to point to the primary version.',
      MISSING_CANONICAL: 'Add <link rel="canonical" href="https://yourdomain.com/this-page/"> in the <head> to prevent duplicate content issues.',
      MISSING_STRUCTURED_DATA: 'Add JSON-LD structured data appropriate to the page type (e.g., Article, Product, LocalBusiness) to enable rich results.',
      MISSING_ALT_TEXT: 'Add descriptive alt="" attributes to all <img> tags describing the image content and relevant keywords.',
      DUPLICATE_H1: 'Ensure only one <h1> tag exists per page. Use <h2> or <h3> for sub-headings.',
      REDIRECT_CHAIN: 'Eliminate redirect chains by updating all links and references to point directly to the final destination URL.',
      LARGE_PAGE_SIZE: 'Reduce page size by compressing images (WebP format), minifying code, and removing unused scripts/styles.',
    };
    return fixes[type] ?? 'Review and resolve the issue to improve search engine visibility and user experience.';
  }

  private buildFallbackSummary(page: CrawledPage, issues: DetectedIssue[]): string {
    const domain = (() => { try { return new URL(page.url).hostname; } catch { return page.url; } })();
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const highCount = issues.filter((i) => i.severity === 'HIGH').length;

    if (issues.length === 0) {
      return `${domain} passed all automated SEO checks with no detected issues. The page has good on-page foundations. Consider adding structured data and expanding content depth for further ranking improvements.`;
    }

    const topIssue = criticalCount > 0
      ? `${criticalCount} critical issue(s) requiring immediate attention`
      : highCount > 0
        ? `${highCount} high-priority issue(s) that should be addressed soon`
        : `${issues.length} moderate/low-priority issue(s)`;

    const missingItems: string[] = [];
    if (!page.title) missingItems.push('title tag');
    if (!page.metaDescription) missingItems.push('meta description');
    if (!page.h1) missingItems.push('H1 heading');

    const missingText = missingItems.length
      ? ` Missing: ${missingItems.join(', ')}.`
      : '';

    return `The SEO audit for ${domain} found ${issues.length} issue(s), including ${topIssue}.${missingText} Addressing these issues — especially the highest-severity ones — will improve search visibility and click-through rates from search results.`;
  }

  private toScore(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : fallback;
  }
}
