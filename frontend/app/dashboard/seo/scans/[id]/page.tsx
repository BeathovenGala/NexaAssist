"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type {
  SeoScan,
  SeoIssue,
  ScannedPage,
  SeoRecommendation,
  IssueSeverity,
  IssueType,
} from "@/lib/types/seo";

const SCAN_TABS = ["Issues", "Pages", "Recommendations"];

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  CRITICAL: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  HIGH: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  MEDIUM: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  LOW: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  INFO: "border-[var(--na-border)] text-[var(--na-muted)] bg-transparent",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  MEDIUM: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  LOW: "border-sky-500/40 text-sky-300 bg-sky-500/10",
};

interface ScanReportData {
  scan: SeoScan;
  issues: SeoIssue[];
  pages: ScannedPage[];
  recommendations: SeoRecommendation[];
}

function ScoreCircle({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const color =
    score === null
      ? "var(--na-muted)"
      : score >= 90
        ? "#34d399"
        : score >= 70
          ? "#fbbf24"
          : "#f87171";
  const pct = score !== null ? score : 0;
  const circumference = 2 * Math.PI * 28;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="-rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-lg font-bold"
          style={{ color }}
        >
          {score !== null ? Math.round(score) : "—"}
        </span>
      </div>
      <p className="text-xs text-[var(--na-muted)]">{label}</p>
    </div>
  );
}

export default function ScanReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ScanReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<IssueType | "ALL">("ALL");

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [scan, issues, pages, recommendations] = await Promise.all([
        apiGet<SeoScan>(`/seo/scans/${id}`),
        apiGet<SeoIssue[]>(`/seo/scans/${id}/issues`),
        apiGet<ScannedPage[]>(`/seo/scans/${id}/pages`),
        apiGet<SeoRecommendation[]>(`/seo/scans/${id}/recommendations`),
      ]);
      setData({ scan, issues, pages, recommendations });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load scan report"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--na-surface)]" />
        <div className="h-48 animate-pulse rounded-lg bg-[var(--na-surface)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-400">{error ?? "Scan not found"}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 text-xs text-rose-400 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { scan, issues, pages, recommendations } = data;

  const filteredIssues = issues.filter(
    (iss) =>
      (severityFilter === "ALL" || iss.severity === severityFilter) &&
      (typeFilter === "ALL" || iss.type === typeFilter),
  );

  const uniqueTypes = [...new Set(issues.map((i) => i.type))];
  const uniqueSeverities = [...new Set(issues.map((i) => i.severity))];

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-[var(--na-muted)]";
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/seo" className="hover:text-[var(--na-accent)]">
          SEO Audit
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/seo/projects/${scan.projectId}`}
          className="hover:text-[var(--na-accent)]"
        >
          {scan.project.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--na-text)]">Scan Report</span>
      </div>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
              Scan Report
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                scan.status === "COMPLETED"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : scan.status === "RUNNING"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    : scan.status === "FAILED"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : "border-[var(--na-border)] bg-[var(--na-surface-2)] text-[var(--na-muted)]"
              }`}
            >
              {scan.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--na-muted)]">{scan.project.baseUrl}</p>
          <p className="text-xs text-[var(--na-muted)]">
            {scan.pagesCrawled} pages · {scan.issuesFound} issues ·{" "}
            {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : "In progress"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/seo/scans/${id}/compare`}
            className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-text)] transition hover:bg-[var(--na-surface-2)]"
          >
            Compare
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Running Progress */}
      {scan.status === "RUNNING" && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-sm text-sky-300">Scan in progress… {scan.pagesCrawled} pages crawled so far</p>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-400" />
          </div>
        </div>
      )}

      {/* Lighthouse Scores */}
      <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Lighthouse Scores
        </h2>
        <div className="flex flex-wrap justify-center gap-10 sm:justify-around">
          <ScoreCircle label="Performance" score={scan.performanceScore} />
          <ScoreCircle label="Accessibility" score={scan.accessibilityScore} />
          <ScoreCircle label="SEO" score={scan.seoScore} />
          <ScoreCircle label="Best Practices" score={scan.bestPracticesScore} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--na-border-subtle)]">
        <div className="flex gap-1">
          {SCAN_TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === i
                  ? "border-[var(--na-accent)] text-[var(--na-accent)]"
                  : "border-transparent text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
            >
              {tab}
              {i === 0 && issues.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--na-surface-2)] px-1.5 py-0.5 text-[10px]">
                  {issues.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Issues */}
      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as IssueSeverity | "ALL")}
              className="rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs text-[var(--na-text)] focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              {uniqueSeverities.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as IssueType | "ALL")}
              className="rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs text-[var(--na-text)] focus:outline-none"
            >
              <option value="ALL">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          {filteredIssues.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No issues found.</p>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        SEVERITY_COLORS[issue.severity]
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-[10px] uppercase text-[var(--na-muted)]">
                      {issue.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-[var(--na-text)]">{issue.title}</p>
                  <p className="mt-1 text-sm text-[var(--na-muted)]">{issue.description}</p>
                  {issue.pageUrl && (
                    <p className="mt-2 text-xs font-mono text-[var(--na-accent)]">
                      {issue.pageUrl}
                    </p>
                  )}
                  {issue.recommendation && (
                    <p className="mt-2 text-xs text-[var(--na-muted)]">
                      <span className="font-medium text-[var(--na-text)]">Fix: </span>
                      {issue.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pages */}
      {activeTab === 1 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--na-border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--na-muted)]">
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Perf</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-4 py-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--na-muted)]">
                    No pages crawled yet.
                  </td>
                </tr>
              ) : (
                pages.map((page, i) => (
                  <tr
                    key={page.id}
                    className={`border-b border-[var(--na-border-subtle)] last:border-0 ${
                      i % 2 === 0 ? "" : "bg-[var(--na-surface)]/30"
                    }`}
                  >
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-mono text-xs text-[var(--na-text)]">
                        {page.url}
                      </p>
                      {page.title && (
                        <p className="text-xs text-[var(--na-muted)]">{page.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          page.statusCode === 200
                            ? "text-emerald-400"
                            : page.statusCode >= 400
                              ? "text-rose-400"
                              : "text-amber-400"
                        }`}
                      >
                        {page.statusCode}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${scoreColor(page.performanceScore)}`}>
                      {page.performanceScore !== null ? Math.round(page.performanceScore) : "—"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${scoreColor(page.seoScore)}`}>
                      {page.seoScore !== null ? Math.round(page.seoScore) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--na-text)]">{page.issueCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Recommendations */}
      {activeTab === 2 && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">
              No recommendations generated yet.
            </p>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        PRIORITY_COLORS[rec.priority] ?? ""
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                    <span className="text-xs text-[var(--na-muted)]">
                      Effort: {rec.effort}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--na-muted)]">
                    Impact: {rec.impactScore}/10
                  </span>
                </div>
                <h3 className="mt-2 font-medium text-[var(--na-text)]">{rec.title}</h3>
                <p className="mt-1 text-sm text-[var(--na-muted)]">{rec.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
