"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiErrorMessage } from "@/lib/apiEnvelope";
import type { WhatsAppStats, WhatsAppBatch, WhatsAppMessageLog } from "@/lib/types/whatsapp";

interface WhatsAppDashboard {
  stats: WhatsAppStats;
  activeBatches: WhatsAppBatch[];
  scheduledBatches: WhatsAppBatch[];
  recentLogs: WhatsAppMessageLog[];
}

const BATCH_STATUS_COLORS: Record<string, string> = {
  PENDING: "border-[var(--na-border)] text-[var(--na-muted)] bg-[var(--na-surface-2)]",
  RUNNING: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  COMPLETED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  FAILED: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  PARTIAL: "border-amber-500/40 text-amber-300 bg-amber-500/10",
};

const MSG_STATUS_COLORS: Record<string, string> = {
  QUEUED: "border-[var(--na-border)] text-[var(--na-muted)]",
  SENT: "border-sky-500/40 text-sky-300",
  DELIVERED: "border-emerald-500/40 text-emerald-300",
  FAILED: "border-rose-500/40 text-rose-300",
  READ: "border-purple-500/40 text-purple-300",
};

export default function WhatsAppPage() {
  const [data, setData] = useState<WhatsAppDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [stats, activeBatches, scheduledBatches, recentLogs] = await Promise.all([
        apiGet<WhatsAppStats>("/whatsapp/stats"),
        apiGet<WhatsAppBatch[]>("/whatsapp/batches", { status: "RUNNING" }),
        apiGet<WhatsAppBatch[]>("/whatsapp/batches", { scheduled: "true" }),
        apiGet<WhatsAppMessageLog[]>("/whatsapp/logs", { take: 10 }),
      ]);
      setData({ stats, activeBatches, scheduledBatches, recentLogs });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load WhatsApp dashboard"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--na-surface)]" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--na-surface)]" />
          ))}
        </div>
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

  const { stats, activeBatches, scheduledBatches, recentLogs } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
            Marketing &amp; Growth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            WhatsApp
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Manage offer delivery and messaging batches
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/whatsapp/templates"
            className="rounded-md border border-[var(--na-border)] bg-transparent px-4 py-2 text-sm text-[var(--na-text)] transition hover:bg-[var(--na-surface-2)]"
          >
            Templates
          </Link>
          <Link
            href="/dashboard/whatsapp/logs"
            className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
          >
            Message Logs
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Sent", value: stats.totalSent.toLocaleString() },
          {
            label: "Delivered",
            value: stats.totalDelivered.toLocaleString(),
            color: "text-emerald-400",
          },
          { label: "Failed", value: stats.totalFailed.toLocaleString(), color: "text-rose-400" },
          {
            label: "Delivery Rate",
            value: `${stats.deliveryRate.toFixed(1)}%`,
            color: stats.deliveryRate >= 90 ? "text-emerald-400" : "text-amber-400",
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Batches */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            Active Batches
          </h2>
          {activeBatches.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No active batches running.</p>
          ) : (
            <div className="space-y-2">
              {activeBatches.map((batch) => {
                const pct = batch.totalCount
                  ? Math.round((batch.sentCount / batch.totalCount) * 100)
                  : 0;
                return (
                  <Link
                    key={batch.id}
                    href={`/dashboard/whatsapp/batches/${batch.id}`}
                    className="block rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 p-4 transition hover:border-[var(--na-accent)]/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--na-text)]">
                        {batch.template?.name ?? `Batch ${batch.id.slice(0, 8)}`}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          BATCH_STATUS_COLORS[batch.status] ?? ""
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-[var(--na-muted)]">
                        <span>
                          {batch.sentCount} / {batch.totalCount} sent
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--na-accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Scheduled */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            Scheduled Sends
          </h2>
          {scheduledBatches.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No scheduled sends.</p>
          ) : (
            <div className="space-y-2">
              {scheduledBatches.map((batch) => (
                <Link
                  key={batch.id}
                  href={`/dashboard/whatsapp/batches/${batch.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 p-4 transition hover:border-[var(--na-accent)]/30"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--na-text)]">
                      {batch.template?.name ?? `Batch ${batch.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-[var(--na-muted)]">
                      {batch.totalCount} recipients
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--na-muted)]">Scheduled</p>
                    <p className="text-sm font-medium text-sky-300">
                      {batch.scheduledAt
                        ? new Date(batch.scheduledAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Message Logs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            Recent Messages
          </h2>
          <Link
            href="/dashboard/whatsapp/logs"
            className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
          >
            View all
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-[var(--na-muted)]">No recent messages.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--na-border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--na-muted)]">
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-b border-[var(--na-border-subtle)] last:border-0 ${
                      i % 2 === 0 ? "" : "bg-[var(--na-surface)]/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-[var(--na-text)]">
                      {log.recipientName ?? log.recipientPhone}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[var(--na-muted)]">
                      {log.content}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          MSG_STATUS_COLORS[log.status] ?? ""
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--na-muted)]">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
