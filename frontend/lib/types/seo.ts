export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type IssueType =
  | "MISSING_META"
  | "BROKEN_LINK"
  | "SLOW_PAGE"
  | "MISSING_ALT"
  | "DUPLICATE_CONTENT"
  | "MISSING_SITEMAP"
  | "MISSING_ROBOTS"
  | "LOW_PERFORMANCE"
  | "ACCESSIBILITY"
  | "BEST_PRACTICE"
  | "OTHER";

export interface SeoProject {
  id: string;
  tenantId: string;
  name: string;
  baseUrl: string;
  maxPages: number;
  lastScanAt: string | null;
  lastScanId: string | null;
  issueCount: number;
  avgScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeoScan {
  id: string;
  projectId: string;
  project: { name: string; baseUrl: string };
  status: ScanStatus;
  pagesCrawled: number;
  issuesFound: number;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface SeoIssue {
  id: string;
  scanId: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  pageUrl: string | null;
  recommendation: string | null;
  resolved: boolean;
}

export interface ScannedPage {
  id: string;
  scanId: string;
  url: string;
  title: string | null;
  statusCode: number;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  issueCount: number;
  crawledAt: string;
}

export interface SeoRecommendation {
  id: string;
  scanId: string;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  impactScore: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
}

export interface SeoProjectStats {
  total: number;
  scansThisMonth: number;
  issuesFound: number;
  avgScore: number | null;
}

export interface IssueSeverityBreakdown {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INFO: number;
}
