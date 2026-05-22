import { Injectable } from '@nestjs/common';
import { SeoIssueSeverity, SeoIssueType } from '@prisma/client';
import type { CrawledPage } from './seo-crawler.service';

export interface DetectedIssue {
  type: SeoIssueType;
  severity: SeoIssueSeverity;
  description: string;
}

export interface EstimatedScores {
  performance: number;
  accessibility: number;
  seoScore: number;
  bestPractices: number;
}

@Injectable()
export class SeoAnalyzerService {
  analyze(page: CrawledPage): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    if (!page.title) {
      issues.push({
        type: SeoIssueType.MISSING_TITLE,
        severity: SeoIssueSeverity.CRITICAL,
        description: 'Page is missing a <title> tag.',
      });
    } else if (page.title.length < 10 || page.title.length > 70) {
      issues.push({
        type: SeoIssueType.MISSING_TITLE,
        severity: SeoIssueSeverity.MEDIUM,
        description: `Title length (${page.title.length} chars) should be 10–70 characters for optimal display in SERPs.`,
      });
    }

    if (!page.metaDescription) {
      issues.push({
        type: SeoIssueType.MISSING_META_DESCRIPTION,
        severity: SeoIssueSeverity.HIGH,
        description: 'Page is missing a meta description. Search engines may auto-generate one, often poorly.',
      });
    } else if (page.metaDescription.length > 160) {
      issues.push({
        type: SeoIssueType.MISSING_META_DESCRIPTION,
        severity: SeoIssueSeverity.LOW,
        description: `Meta description length (${page.metaDescription.length} chars) exceeds 160 characters and will be truncated in search results.`,
      });
    }

    if (!page.h1) {
      issues.push({
        type: SeoIssueType.MISSING_H1,
        severity: SeoIssueSeverity.HIGH,
        description: 'Page is missing an H1 heading. H1 is a primary ranking signal and essential for accessibility.',
      });
    } else if (page.h1s.length > 1) {
      issues.push({
        type: SeoIssueType.DUPLICATE_H1,
        severity: SeoIssueSeverity.MEDIUM,
        description: `Page has ${page.h1s.length} H1 headings (${page.h1s.map((h) => `"${h}"`).join(', ')}). Use a single H1 per page and demote extras to H2/H3.`,
      });
    }

    if (page.missingAltCount > 0) {
      issues.push({
        type: SeoIssueType.MISSING_ALT_TEXT,
        severity: SeoIssueSeverity.HIGH,
        description: `${page.missingAltCount} of ${page.totalImages} image(s) are missing descriptive alt text. Add alt attributes for accessibility and image SEO.`,
      });
    }

    if (page.loadTimeMs > 0 && page.loadTimeMs > 3000) {
      issues.push({
        type: SeoIssueType.SLOW_PAGE_SPEED,
        severity: page.loadTimeMs > 5000 ? SeoIssueSeverity.HIGH : SeoIssueSeverity.MEDIUM,
        description: `Page load time (${page.loadTimeMs}ms) exceeds the recommended 3 second threshold. ${page.loadTimeMs > 5000 ? 'This significantly harms Core Web Vitals and rankings.' : 'Consider optimizing images and scripts.'}`,
      });
    }

    if (page.statusCode >= 400) {
      issues.push({
        type: SeoIssueType.BROKEN_LINK,
        severity: SeoIssueSeverity.CRITICAL,
        description: `Page returned HTTP ${page.statusCode}. This URL cannot be indexed and any backlinks pointing to it are wasted.`,
      });
    }

    if (page.wordCount < 300 && page.wordCount > 0) {
      issues.push({
        type: SeoIssueType.DUPLICATE_CONTENT,
        severity: SeoIssueSeverity.LOW,
        description: `Page has a low word count (${page.wordCount} words). Thin content may be less competitive in search rankings. Aim for at least 300 words.`,
      });
    }

    if (!page.canonicalUrl) {
      issues.push({
        type: SeoIssueType.MISSING_CANONICAL,
        severity: SeoIssueSeverity.MEDIUM,
        description: 'No canonical URL tag found. Without a canonical, search engines may index duplicate versions of this page.',
      });
    }

    if (!page.hasSchemaMarkup) {
      issues.push({
        type: SeoIssueType.MISSING_STRUCTURED_DATA,
        severity: SeoIssueSeverity.INFO,
        description: 'No structured data (Schema.org / JSON-LD) detected. Adding structured data can enable rich results in Google Search.',
      });
    }

    return issues;
  }

  /**
   * Deterministically estimates SEO-related scores from actual crawl data.
   * No randomness — the same page always produces the same scores.
   */
  estimateScores(page: CrawledPage): EstimatedScores {
    // Performance: derived from actual load time
    let performance: number;
    const lt = page.loadTimeMs;
    if (lt === 0) {
      performance = 50; // unknown / crawl failed
    } else if (lt < 800) {
      performance = 95;
    } else if (lt < 1500) {
      performance = 85;
    } else if (lt < 2500) {
      performance = 72;
    } else if (lt < 4000) {
      performance = 58;
    } else {
      performance = 35;
    }

    // SEO Score: deduct for missing/wrong critical SEO elements
    let seoScore = 100;
    if (!page.title) seoScore -= 25;
    else if (page.title.length < 10 || page.title.length > 70) seoScore -= 10;
    if (!page.metaDescription) seoScore -= 20;
    else if (page.metaDescription.length > 160) seoScore -= 5;
    if (!page.h1) seoScore -= 20;
    else if (page.h1s.length > 1) seoScore -= 8;
    if (page.missingAltCount > 0) seoScore -= Math.min(15, page.missingAltCount * 3);
    if (!page.canonicalUrl) seoScore -= 8;
    if (!page.hasSchemaMarkup) seoScore -= 7;
    if (page.wordCount < 300) seoScore -= 10;
    seoScore = Math.max(0, seoScore);

    // Accessibility: structural completeness estimate
    let accessibility = 90;
    if (!page.title) accessibility -= 15;
    if (!page.h1) accessibility -= 10;
    if (page.missingAltCount > 0) accessibility -= Math.min(20, page.missingAltCount * 4);
    if (page.wordCount < 100) accessibility -= 10;
    if (!page.url.startsWith('https')) accessibility -= 5;
    accessibility = Math.max(20, accessibility);

    // Best Practices: HTTPS, canonical, structured data presence
    let bestPractices = 100;
    if (!page.url.startsWith('https')) bestPractices -= 25;
    if (!page.canonicalUrl) bestPractices -= 10;
    if (!page.hasSchemaMarkup) bestPractices -= 5;
    bestPractices = Math.max(0, bestPractices);

    return { performance, accessibility, seoScore, bestPractices };
  }
}
