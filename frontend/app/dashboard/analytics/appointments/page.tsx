"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { AppointmentAnalytics } from "@/lib/types/analytics";

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--na-muted)]">{label}</span>
        <span className="font-medium text-[var(--na-text)]">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AppointmentAnalyticsPage() {
  const [data, setData] = useState<AppointmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<AppointmentAnalytics>("/analytics/appointments");
      setData(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load appointment analytics"));
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
          <span className="text-[var(--na-text)]">Appointments</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Appointment Analytics
        </h1>
        <p className="text-sm text-[var(--na-muted)]">
          Booking performance, rates, and patterns
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
              { label: "Total", value: data.total.toLocaleString() },
              {
                label: "Confirmed",
                value: data.confirmed.toLocaleString(),
                color: "text-emerald-400",
              },
              {
                label: "Cancelled",
                value: data.cancelled.toLocaleString(),
                color: "text-rose-400",
              },
              {
                label: "No-shows",
                value: data.noShows.toLocaleString(),
                color: "text-amber-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  {s.label}
                </p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${s.color ?? "text-[var(--na-text)]"}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Rate Bars */}
          <div className="space-y-4 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Rate Breakdown
            </h2>
            <RateBar label="Confirmation Rate" value={data.confirmedRate} color="bg-emerald-400" />
            <RateBar label="Cancellation Rate" value={data.cancellationRate} color="bg-rose-400" />
            <RateBar label="No-show Rate" value={data.noShowRate} color="bg-amber-400" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* By Service Type */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                By Service Type
              </h2>
              {data.byServiceType.length === 0 ? (
                <p className="text-sm text-[var(--na-muted)]">No data available.</p>
              ) : (
                <div className="space-y-2">
                  {data.byServiceType.slice(0, 8).map((s) => {
                    const maxCount = Math.max(...data.byServiceType.map((x) => x.count));
                    return (
                      <div key={s.serviceType} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--na-text)]">{s.serviceType}</span>
                          <span className="tabular-nums text-[var(--na-muted)]">{s.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                          <div
                            className="h-full rounded-full bg-[var(--na-accent)]"
                            style={{ width: `${(s.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* By Staff */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                By Staff Member
              </h2>
              {data.byStaff.length === 0 ? (
                <p className="text-sm text-[var(--na-muted)]">No data available.</p>
              ) : (
                <div className="space-y-2">
                  {data.byStaff.slice(0, 8).map((s) => {
                    const maxCount = Math.max(...data.byStaff.map((x) => x.count));
                    return (
                      <div key={s.staffName} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--na-text)]">{s.staffName}</span>
                          <span className="tabular-nums text-[var(--na-muted)]">{s.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                          <div
                            className="h-full rounded-full bg-purple-400"
                            style={{ width: `${(s.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Time-of-day Heatmap Placeholder */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Bookings by Hour
            </h2>
            {data.byHour.length > 0 ? (
              <div className="flex items-end gap-1 overflow-x-auto py-2">
                {data.byHour.map((h) => {
                  const maxCount = Math.max(...data.byHour.map((x) => x.count), 1);
                  const height = Math.max((h.count / maxCount) * 80, 4);
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 rounded-t bg-[var(--na-accent)]/60 transition-all"
                        style={{ height: `${height}px` }}
                        title={`${h.hour}:00 — ${h.count} bookings`}
                      />
                      <span className="text-[9px] text-[var(--na-muted)]">{h.hour}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--na-border)] p-8 text-center">
                <p className="text-sm text-[var(--na-muted)]">Heatmap data not available.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
