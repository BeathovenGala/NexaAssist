"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { InventoryAnalytics } from "@/lib/types/analytics";

export default function InventoryAnalyticsPage() {
  const [data, setData] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<InventoryAnalytics>("/analytics/inventory");
      setData(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load inventory analytics"));
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
          <span className="text-[var(--na-text)]">Inventory</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Inventory Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          Stock levels, movements, and alerts
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
              { label: "Total Items", value: data.totalItems.toLocaleString() },
              {
                label: "Low Stock",
                value: data.lowStockCount.toLocaleString(),
                color: "text-amber-400",
              },
              {
                label: "Out of Stock",
                value: data.outOfStockCount.toLocaleString(),
                color: "text-rose-400",
              },
              {
                label: "Expiring Soon",
                value: data.expiringCount.toLocaleString(),
                color: "text-orange-400",
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

          {/* Stock Movement Chart Placeholder */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Stock Movement (Daily)
            </h2>
            {data.stockMovementByDay.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
                <div className="flex items-end gap-2">
                  {data.stockMovementByDay.slice(-14).map((day) => {
                    const maxVal = Math.max(
                      ...data.stockMovementByDay.map((d) => Math.max(d.inflow, d.outflow)),
                      1,
                    );
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-0.5">
                        <div className="flex items-end gap-0.5">
                          <div
                            className="w-3 rounded-t bg-emerald-400/70"
                            style={{ height: `${(day.inflow / maxVal) * 60}px` }}
                            title={`Inflow: ${day.inflow}`}
                          />
                          <div
                            className="w-3 rounded-t bg-rose-400/70"
                            style={{ height: `${(day.outflow / maxVal) * 60}px` }}
                            title={`Outflow: ${day.outflow}`}
                          />
                        </div>
                        <span className="text-[8px] text-[var(--na-muted)]">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-[var(--na-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-emerald-400/70" />
                    Inflow
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-sm bg-rose-400/70" />
                    Outflow
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--na-border)] p-8 text-center">
                <p className="text-sm text-[var(--na-muted)]">No movement data available.</p>
              </div>
            )}
          </section>

          {/* Top Moving Items */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Top Moving Items
            </h2>
            {data.topMovingItems.length === 0 ? (
              <p className="text-sm text-[var(--na-muted)]">No data available.</p>
            ) : (
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] divide-y divide-[var(--na-border-subtle)]">
                {data.topMovingItems.map((item, i) => {
                  const maxMovements = Math.max(...data.topMovingItems.map((x) => x.movements), 1);
                  return (
                    <div key={item.itemName} className="flex items-center gap-4 px-4 py-3">
                      <span className="w-5 text-center text-xs text-[var(--na-muted)]">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--na-text)]">{item.itemName}</p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                          <div
                            className="h-full rounded-full bg-[var(--na-accent)]"
                            style={{ width: `${(item.movements / maxMovements) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 tabular-nums text-sm text-[var(--na-muted)]">
                        {item.movements}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
