"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { GlobalKpis, AiInsight, DateRange } from "@/lib/types/analytics";

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

const MODULE_CARDS = [
  {
    label: "Appointments",
    href: "/dashboard/analytics/appointments",
    description: "Bookings, confirmations, cancellations",
    color: "border-[var(--na-accent)]/30 bg-[var(--na-accent)]/5",
  },
  {
    label: "Inventory",
    href: "/dashboard/analytics/inventory",
    description: "Stock movements, alerts, expiry",
    color: "border-emerald-500/30 bg-emerald-500/5",
  },
  {
    label: "Campaigns",
    href: "/dashboard/analytics/campaigns",
    description: "Delivery rates, conversions, channels",
    color: "border-purple-500/30 bg-purple-500/5",
  },
  {
    label: "Chatbot",
    href: "/dashboard/analytics/chatbot",
    description: "Conversations, intents, resolutions",
    color: "border-sky-500/30 bg-sky-500/5",
  },
  {
    label: "SEO",
    href: "/dashboard/analytics/seo",
    description: "Scores, issues, trends",
    color: "border-amber-500/30 bg-amber-500/5",
  },
];

interface AnalyticsDashboardData {
  kpis: GlobalKpis;
  insights: AiInsight[];
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useEffect(() => {
    void load();
  }, [dateRange]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [kpis, insights] = await Promise.all([
        apiGet<GlobalKpis>("/analytics/kpis", { range: dateRange }),
        apiGet<AiInsight[]>("/analytics/insights"),
      ]);
      setData({ kpis, insights });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
            <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_theme(colors.purple.400)]" />
            Marketing &amp; Growth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            Analytics &amp; Insights
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Platform-wide performance overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setDateRange(r.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                dateRange === r.value
                  ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
                  : "border-[var(--na-border)] text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="na-card h-24 animate-pulse opacity-60"
            />
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
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Appointments",
              value: data.kpis.appointments.toLocaleString(),
            },
            {
              label: "Revenue",
              value: `$${data.kpis.revenue.toLocaleString()}`,
              color: "text-emerald-400",
            },
            {
              label: "Campaigns Sent",
              value: data.kpis.campaignsSent.toLocaleString(),
              color: "text-purple-400",
            },
            {
              label: "Msgs Delivered",
              value: data.kpis.messagesDelivered.toLocaleString(),
              color: "text-sky-400",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="na-card p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                {kpi.label}
              </p>
              <p
                className={`mt-2 text-3xl font-semibold tabular-nums ${
                  kpi.color ?? "text-[var(--na-text)]"
                }`}
              >
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-[var(--na-muted)]">{data.kpis.periodLabel}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Module Cards */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Drill Down by Module
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARDS.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`na-card group p-5 transition hover:-translate-y-0.5 ${card.color}`}
            >
              <h3 className="font-medium text-[var(--na-text)] group-hover:text-[var(--na-accent)]">
                {card.label}
              </h3>
              <p className="mt-1 text-xs text-[var(--na-muted)]">{card.description}</p>
              <p className="mt-3 text-xs font-semibold text-[var(--na-accent)]">
                View analytics →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Insights */}
      {data && data.insights.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              AI Insights
            </h2>
            <span className="rounded-full border border-[var(--na-accent)]/30 bg-[var(--na-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--na-accent)]">
              ✦ AI
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.insights.map((insight) => (
              <div
                key={insight.id}
                className="na-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-[var(--na-accent)]">
                    {insight.module}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                      insight.priority === "HIGH"
                        ? "border-rose-500/40 text-rose-300"
                        : insight.priority === "MEDIUM"
                          ? "border-amber-500/40 text-amber-300"
                          : "border-[var(--na-border)] text-[var(--na-muted)]"
                    }`}
                  >
                    {insight.priority}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-medium text-[var(--na-text)]">{insight.title}</h3>
                <p className="mt-1 text-xs text-[var(--na-muted)]">{insight.insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
