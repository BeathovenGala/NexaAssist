"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { SeoScan, SeoIssue } from "@/lib/types/seo";

interface CompareData {
  current: SeoScan;
  previous: SeoScan | null;
  currentIssues: SeoIssue[];
  previousIssues: SeoIssue[];
}

function ScoreDiff({ current, previous, label }: { current: number | null; previous: number | null; label: string }) {
  const diff = current !== null && previous !== null ? current - previous : null;
  const color =
    current === null
      ? "text-[var(--na-muted)]"
      : current >= 90
        ? "text-emerald-400"
        : current >= 70
          ? "text-amber-400"
          : "text-rose-400";

  return (
    <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">{label}</p>
      <div className="mt-2 flex items-end justify-center gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${color}`}>
          {current !== null ? Math.round(current) : "—"}
        </span>
        {diff !== null && (
          <span
            className={`mb-1 text-sm font-medium ${
              diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-[var(--na-muted)]"
            }`}
          >
            {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
          </span>
        )}
      </div>
      {previous !== null && (
        <p className="mt-1 text-xs text-[var(--na-muted)]">
          was {Math.round(previous)}
        </p>
      )}
    </div>
  );
}

export default function ScanComparePage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const current = await apiGet<SeoScan>(`/seo/scans/${id}`);
      const allScans = await apiGet<SeoScan[]>(`/seo/projects/${current.projectId}/scans`);
      const currentIdx = allScans.findIndex((s) => s.id === id);
      const previous = currentIdx < allScans.length - 1 ? allScans[currentIdx + 1] : null;

      const [currentIssues, previousIssues] = await Promise.all([
        apiGet<SeoIssue[]>(`/seo/scans/${id}/issues`),
        previous ? apiGet<SeoIssue[]>(`/seo/scans/${previous.id}/issues`) : Promise.resolve([]),
      ]);

      setData({ current, previous, currentIssues, previousIssues });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load comparison"));
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
        <p className="text-sm text-rose-400">{error ?? "Failed to load"}</p>
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

  const { current, previous, currentIssues, previousIssues } = data;

  const previousIssueIds = new Set(previousIssues.map((i) => i.type + i.pageUrl));
  const currentIssueIds = new Set(currentIssues.map((i) => i.type + i.pageUrl));

  const resolvedIssues = previousIssues.filter((i) => !currentIssueIds.has(i.type + i.pageUrl));
  const newIssues = currentIssues.filter((i) => !previousIssueIds.has(i.type + i.pageUrl));

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/seo" className="hover:text-[var(--na-accent)]">
          SEO Audit
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/seo/projects/${current.projectId}`}
          className="hover:text-[var(--na-accent)]"
        >
          {current.project.name}
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/seo/scans/${id}`}
          className="hover:text-[var(--na-accent)]"
        >
          Scan Report
        </Link>
        <span>/</span>
        <span className="text-[var(--na-text)]">Compare</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Scan Comparison
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          {previous ? (
            <>
              {new Date(current.createdAt).toLocaleDateString()} vs{" "}
              {new Date(previous.createdAt).toLocaleDateString()}
            </>
          ) : (
            "No previous scan to compare with"
          )}
        </p>
      </div>

      {!previous && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-300">
            This is the first scan for this project. Run more scans to enable comparison.
          </p>
        </div>
      )}

      {/* Score Comparison */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Score Changes
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreDiff
            label="Performance"
            current={current.performanceScore}
            previous={previous?.performanceScore ?? null}
          />
          <ScoreDiff
            label="Accessibility"
            current={current.accessibilityScore}
            previous={previous?.accessibilityScore ?? null}
          />
          <ScoreDiff
            label="SEO Score"
            current={current.seoScore}
            previous={previous?.seoScore ?? null}
          />
          <ScoreDiff
            label="Best Practices"
            current={current.bestPracticesScore}
            previous={previous?.bestPracticesScore ?? null}
          />
        </div>
      </div>

      {/* Issues Diff */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resolved */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Resolved Issues
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
              {resolvedIssues.length}
            </span>
          </div>
          {resolvedIssues.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No issues resolved.</p>
          ) : (
            <div className="space-y-2">
              {resolvedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                >
                  <p className="text-sm font-medium text-emerald-300">✓ {issue.title}</p>
                  {issue.pageUrl && (
                    <p className="mt-1 font-mono text-[10px] text-[var(--na-muted)]">
                      {issue.pageUrl}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* New Issues */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              New Issues
            </h2>
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300">
              {newIssues.length}
            </span>
          </div>
          {newIssues.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No new issues introduced.</p>
          ) : (
            <div className="space-y-2">
              {newIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3"
                >
                  <p className="text-sm font-medium text-rose-300">! {issue.title}</p>
                  <p className="text-[10px] font-medium uppercase text-rose-400">
                    {issue.severity}
                  </p>
                  {issue.pageUrl && (
                    <p className="mt-1 font-mono text-[10px] text-[var(--na-muted)]">
                      {issue.pageUrl}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Pages Crawled",
            current: current.pagesCrawled,
            previous: previous?.pagesCrawled ?? null,
          },
          {
            label: "Total Issues",
            current: current.issuesFound,
            previous: previous?.issuesFound ?? null,
          },
          {
            label: "Issues Resolved",
            current: resolvedIssues.length,
            previous: null,
            color: "text-emerald-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-center"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
              {s.label}
            </p>
            <p className={`mt-2 text-2xl font-semibold ${s.color ?? "text-[var(--na-text)]"}`}>
              {s.current}
            </p>
            {s.previous !== null && (
              <p className="text-xs text-[var(--na-muted)]">was {s.previous}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
