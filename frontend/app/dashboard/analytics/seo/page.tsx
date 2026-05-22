"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { SeoAnalyticsSummary } from "@/lib/types/analytics";

export default function SeoAnalyticsPage() {
  const [data, setData] = useState<SeoAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<SeoAnalyticsSummary>("/analytics/seo");
      setData(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load SEO analytics"));
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-[var(--na-muted)]";
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
          <Link href="/dashboard/analytics" className="hover:text-[var(--na-accent)]">
            Analytics
          </Link>
          <span>/</span>
          <span className="text-[var(--na-text)]">SEO</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          SEO Analytics
        </h1>
        <p className="text-sm text-[var(--na-muted)]">
          Scores, issue trends, and resolution tracking
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--na-surface)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-xs text-rose-400 underline"
          >
            Retry
          </button>
        </div>
      ) : !data ? null : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Avg SEO Score",
                value: data.avgScore !== null ? Math.round(data.avgScore).toString() : "—",
                color: scoreColor(data.avgScore),
              },
              { label: "Total Scans", value: data.totalScans.toLocaleString() },
              {
                label: "Issues Resolved",
                value: data.issuesResolved.toLocaleString(),
                color: "text-emerald-400",
              },
              {
                label: "New Issues",
                value: data.newIssues.toLocaleString(),
                color: "text-rose-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  {s.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-semibold tabular-nums ${
                    s.color ?? "text-[var(--na-text)]"
                  }`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Score Trend */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Average SEO Score Trend
            </h2>
            {data.scoreByDay.length > 0 ? (
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
                <div className="relative">
                  <div className="flex items-end gap-2 overflow-x-auto">
                    {data.scoreByDay.slice(-20).map((d) => {
                      const color =
                        d.score >= 90
                          ? "bg-emerald-400/70"
                          : d.score >= 70
                            ? "bg-amber-400/70"
                            : "bg-rose-400/70";
                      const height = Math.max((d.score / 100) * 80, 4);
                      return (
                        <div key={d.date} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-6 rounded-t transition-all ${color}`}
                            style={{ height: `${height}px` }}
                            title={`${d.date}: ${d.score}`}
                          />
                          <span className="text-[8px] text-[var(--na-muted)]">
                            {new Date(d.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Score scale labels */}
                  <div className="mt-2 flex justify-end gap-4 text-[9px] text-[var(--na-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-3 rounded-sm bg-emerald-400/70" />
                      ≥90
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-3 rounded-sm bg-amber-400/70" />
                      70-89
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-3 rounded-sm bg-rose-400/70" />
                      &lt;70
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--na-border)] p-8 text-center">
                <p className="text-sm text-[var(--na-muted)]">No score trend data available.</p>
              </div>
            )}
          </section>

          {/* Top Issue Types */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Top Issue Types
            </h2>
            {data.topIssueTypes.length === 0 ? (
              <p className="text-sm text-[var(--na-muted)]">No issue data available.</p>
            ) : (
              <div className="space-y-2">
                {data.topIssueTypes
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((issue) => {
                    const maxCount = Math.max(...data.topIssueTypes.map((x) => x.count), 1);
                    return (
                      <div key={issue.type} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--na-text)]">
                            {issue.type.replace(/_/g, " ")}
                          </span>
                          <span className="tabular-nums text-[var(--na-muted)]">
                            {issue.count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${(issue.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Quick Link */}
          <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4">
            <p className="text-sm text-[var(--na-muted)]">
              Want to dive deeper?{" "}
              <Link
                href="/dashboard/seo"
                className="font-medium text-[var(--na-accent)] hover:underline"
              >
                Open SEO Audit Dashboard →
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
