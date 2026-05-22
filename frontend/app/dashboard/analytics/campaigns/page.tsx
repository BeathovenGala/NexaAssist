"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { CampaignAnalyticsSummary } from "@/lib/types/analytics";

export default function CampaignAnalyticsPage() {
  const [data, setData] = useState<CampaignAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<CampaignAnalyticsSummary>("/analytics/campaigns");
      setData(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load campaign analytics"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
          <Link href="/dashboard/analytics" className="hover:text-[var(--na-accent)]">
            Analytics
          </Link>
          <span>/</span>
          <span className="text-[var(--na-text)]">Campaigns</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Campaign Analytics
        </h1>
        <p className="text-sm text-[var(--na-muted)]">
          Performance across all marketing campaigns
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Total Campaigns", value: data.totalCampaigns },
              {
                label: "Active",
                value: data.activeCampaigns,
                color: "text-emerald-400",
              },
              {
                label: "Delivery Rate",
                value: `${data.deliveryRate.toFixed(1)}%`,
                color:
                  data.deliveryRate >= 90
                    ? "text-emerald-400"
                    : data.deliveryRate >= 70
                      ? "text-amber-400"
                      : "text-rose-400",
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

          {/* Channel Breakdown */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Channel Breakdown
            </h2>
            {data.byChannel.length === 0 ? (
              <p className="text-sm text-[var(--na-muted)]">No channel data.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.byChannel.map((ch) => (
                  <div
                    key={ch.channel}
                    className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
                  >
                    <p className="text-xs font-bold uppercase text-[var(--na-muted)]">
                      {ch.channel}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--na-text)]">{ch.count}</p>
                    <p className="text-xs text-[var(--na-muted)]">
                      {ch.deliveryRate.toFixed(1)}% delivery
                    </p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--na-accent)]"
                        style={{ width: `${ch.deliveryRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top Performing Campaigns */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Top Performing Campaigns
            </h2>
            {data.topCampaigns.length === 0 ? (
              <p className="text-sm text-[var(--na-muted)]">No campaign data available.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--na-border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--na-muted)]">
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Total Sent</th>
                      <th className="px-4 py-3">Delivery Rate</th>
                      <th className="px-4 py-3">Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCampaigns.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`border-b border-[var(--na-border-subtle)] last:border-0 ${
                          i % 2 === 0 ? "" : "bg-[var(--na-surface)]/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/campaigns/${c.id}`}
                            className="font-medium text-[var(--na-text)] hover:text-[var(--na-accent)]"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--na-muted)]">
                          {c.totalSent.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--na-border)]">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${c.deliveryRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--na-muted)]">
                              {c.deliveryRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-purple-400">
                          {c.conversions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
