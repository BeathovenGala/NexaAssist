import type { DetectedIssue } from './seo-analyzer.service';

export interface QuickAuditResult {
  url: string;
  projectId: string;
  scanId: string;
  crawlSucceeded: boolean;
  overallScore: number;
  categories: {
    technicalSeo: number;
    content: number;
    performance: number;
    ux: number;
  };
  issues: DetectedIssue[];
  whatIsGood: string[];
  whatToFix: Array<{
    title: string;
    severity: string;
    detail: string;
    fix: string;
  }>;
  summary: string;
  crawledAt: Date;
}
