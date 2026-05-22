"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { ChatbotAnalytics } from "@/lib/types/analytics";

export default function ChatbotAnalyticsPage() {
  const [data, setData] = useState<ChatbotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ChatbotAnalytics>("/analytics/chatbot");
      setData(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load chatbot analytics"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
          <Link href="/dashboard/analytics" className="hover:text-[var(--na-accent)]">
            Analytics
          </Link>
          <span>/</span>
          <span className="text-[var(--na-text)]">Chatbot</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Chatbot Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          AI assistant conversations, intents, and resolution rates
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
              { label: "Total Conversations", value: data.totalConversations.toLocaleString() },
              {
                label: "Resolved",
                value: data.resolved.toLocaleString(),
                color: "text-emerald-400",
              },
              {
                label: "Escalated",
                value: data.escalated.toLocaleString(),
                color: "text-amber-400",
              },
              {
                label: "Avg Duration",
                value: `${Math.round(data.avgSessionDuration)}s`,
                color: "text-sky-400",
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

          {/* Resolution Rate */}
          {data.totalConversations > 0 && (
            <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                Conversation Outcomes
              </h2>
              <div className="flex gap-2">
                {[
                  {
                    label: "Resolved",
                    count: data.resolved,
                    color: "bg-emerald-400",
                    textColor: "text-emerald-300",
                  },
                  {
                    label: "Escalated",
                    count: data.escalated,
                    color: "bg-amber-400",
                    textColor: "text-amber-300",
                  },
                  {
                    label: "Other",
                    count: data.totalConversations - data.resolved - data.escalated,
                    color: "bg-[var(--na-border)]",
                    textColor: "text-[var(--na-muted)]",
                  },
                ]
                  .filter((s) => s.count > 0)
                  .map((s) => {
                    const pct = (s.count / data.totalConversations) * 100;
                    return (
                      <div
                        key={s.label}
                        className={`${s.color} flex items-center justify-center rounded px-2 py-1 text-xs font-medium text-white transition-all`}
                        style={{ width: `${pct}%`, minWidth: "40px" }}
                        title={`${s.label}: ${s.count} (${pct.toFixed(1)}%)`}
                      >
                        {pct > 10 ? `${Math.round(pct)}%` : ""}
                      </div>
                    );
                  })}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--na-muted)]">
                {[
                  { label: "Resolved", color: "bg-emerald-400", count: data.resolved },
                  { label: "Escalated", color: "bg-amber-400", count: data.escalated },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-3 rounded-sm ${s.color}`} />
                    {s.label} ({s.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Intent Breakdown */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Top Intents
            </h2>
            {data.intentBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--na-muted)]">No intent data available.</p>
            ) : (
              <div className="space-y-2">
                {data.intentBreakdown
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((intent) => {
                    const maxCount = Math.max(...data.intentBreakdown.map((x) => x.count), 1);
                    return (
                      <div key={intent.intent} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-[var(--na-text)]">
                            {intent.intent.replace(/_/g, " ")}
                          </span>
                          <span className="tabular-nums text-[var(--na-muted)]">
                            {intent.count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                          <div
                            className="h-full rounded-full bg-sky-400"
                            style={{ width: `${(intent.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Sessions by Day */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Session Volume (Last 14 Days)
            </h2>
            {data.sessionsByDay.length > 0 ? (
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
                <div className="flex items-end gap-2">
                  {data.sessionsByDay.slice(-14).map((d) => {
                    const maxCount = Math.max(...data.sessionsByDay.map((x) => x.count), 1);
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-1">
                        <div
                          className="w-6 rounded-t bg-sky-400/60 transition-all"
                          style={{ height: `${Math.max((d.count / maxCount) * 80, 4)}px` }}
                          title={`${d.date}: ${d.count} sessions`}
                        />
                        <span className="text-[8px] text-[var(--na-muted)]">
                          {new Date(d.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--na-border)] p-8 text-center">
                <p className="text-sm text-[var(--na-muted)]">No session data available.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
