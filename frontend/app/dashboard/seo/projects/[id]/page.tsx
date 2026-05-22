"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { SeoProject, SeoScan, IssueSeverityBreakdown } from "@/lib/types/seo";

interface ProjectDetailData {
  project: SeoProject;
  scans: SeoScan[];
  latestSeverities: IssueSeverityBreakdown | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  LOW: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  INFO: "bg-[var(--na-surface-2)] text-[var(--na-muted)] border-[var(--na-border)]",
};

export default function SeoProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [project, scans] = await Promise.all([
        apiGet<SeoProject>(`/seo/projects/${id}`),
        apiGet<SeoScan[]>(`/seo/projects/${id}/scans`),
      ]);
      const latest = scans[0] ?? null;
      let severities: IssueSeverityBreakdown | null = null;
      if (latest) {
        severities = await apiGet<IssueSeverityBreakdown>(
          `/seo/scans/${latest.id}/severity-breakdown`,
        ).catch(() => null);
      }
      setData({ project, scans, latestSeverities: severities });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load project"));
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerScan() {
    setScanning(true);
    try {
      await apiPost(`/seo/projects/${id}/scan`, {});
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to start scan"));
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--na-surface)]" />
        <div className="h-40 animate-pulse rounded-lg bg-[var(--na-surface)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-400">{error ?? "Project not found"}</p>
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

  const { project, scans, latestSeverities } = data;
  const latestScan = scans[0] ?? null;

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
        <span className="text-[var(--na-text)]">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">{project.baseUrl}</p>
        </div>
        <button
          type="button"
          disabled={scanning}
          onClick={() => void handleTriggerScan()}
          className="flex shrink-0 items-center gap-2 rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-40"
        >
          {scanning ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--na-accent)] border-t-transparent" />
              Scanning…
            </>
          ) : (
            "Trigger New Scan"
          )}
        </button>
      </div>

      {/* Latest Scan Summary */}
      {latestScan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Latest Scan
            </h2>
            <Link
              href={`/dashboard/seo/scans/${latestScan.id}`}
              className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
            >
              View full report →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Performance",
                value: latestScan.performanceScore,
                color: scoreColor(latestScan.performanceScore),
              },
              {
                label: "Accessibility",
                value: latestScan.accessibilityScore,
                color: scoreColor(latestScan.accessibilityScore),
              },
              {
                label: "SEO Score",
                value: latestScan.seoScore,
                color: scoreColor(latestScan.seoScore),
              },
              {
                label: "Best Practices",
                value: latestScan.bestPracticesScore,
                color: scoreColor(latestScan.bestPracticesScore),
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  {s.label}
                </p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${s.color}`}>
                  {s.value !== null ? Math.round(s.value) : "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[var(--na-muted)]">
            <span>{latestScan.pagesCrawled} pages crawled</span>
            <span>{latestScan.issuesFound} issues found</span>
            {latestScan.completedAt && (
              <span>{new Date(latestScan.completedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Severity Breakdown */}
      {latestSeverities && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            Issue Breakdown
          </h2>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(latestSeverities) as [string, number][])
              .filter(([, count]) => count > 0)
              .map(([severity, count]) => (
                <div
                  key={severity}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                    SEVERITY_COLORS[severity] ?? ""
                  }`}
                >
                  <span className="text-xs font-bold uppercase">{severity}</span>
                  <span className="text-xl font-semibold tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Scan History */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Scan History
        </h2>
        {scans.length === 0 ? (
          <p className="text-sm text-[var(--na-muted)]">No scans yet. Trigger your first scan.</p>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <Link
                key={scan.id}
                href={`/dashboard/seo/scans/${scan.id}`}
                className="group flex items-center justify-between rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 px-4 py-3 transition hover:border-[var(--na-accent)]/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        scan.status === "COMPLETED"
                          ? "bg-emerald-400"
                          : scan.status === "RUNNING"
                            ? "animate-pulse bg-sky-400"
                            : scan.status === "FAILED"
                              ? "bg-rose-400"
                              : "bg-[var(--na-muted)]"
                      }`}
                    />
                    <span className="text-sm font-medium text-[var(--na-text)] group-hover:text-[var(--na-accent)]">
                      {scan.status === "RUNNING" ? "Scan in progress…" : "Scan completed"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--na-muted)]">
                    {scan.pagesCrawled} pages · {scan.issuesFound} issues
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-semibold ${scoreColor(scan.seoScore)}`}>
                    {scan.seoScore !== null ? Math.round(scan.seoScore) : "—"}
                  </p>
                  <p className="text-xs text-[var(--na-muted)]">
                    {scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
