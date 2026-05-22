"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { WhatsAppBatch, WhatsAppMessageLog } from "@/lib/types/whatsapp";

const MSG_STATUS_COLORS: Record<string, string> = {
  QUEUED: "border-[var(--na-border)] text-[var(--na-muted)] bg-transparent",
  SENT: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  DELIVERED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  FAILED: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  READ: "border-purple-500/40 text-purple-300 bg-purple-500/10",
};

interface BatchDetailData {
  batch: WhatsAppBatch;
  logs: WhatsAppMessageLog[];
}

export default function BatchDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<BatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [batch, logs] = await Promise.all([
        apiGet<WhatsAppBatch>(`/whatsapp/batches/${id}`),
        apiGet<WhatsAppMessageLog[]>(`/whatsapp/batches/${id}/logs`),
      ]);
      setData({ batch, logs });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load batch"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryFailed() {
    setRetrying(true);
    try {
      await apiPost(`/whatsapp/batches/${id}/retry-failed`, {});
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to retry"));
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--na-surface)]" />
        <div className="h-32 animate-pulse rounded-lg bg-[var(--na-surface)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-400">{error ?? "Batch not found"}</p>
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

  const { batch, logs } = data;
  const deliveryPct = batch.totalCount
    ? Math.round((batch.deliveredCount / batch.totalCount) * 100)
    : 0;
  const sentPct = batch.totalCount
    ? Math.round((batch.sentCount / batch.totalCount) * 100)
    : 0;
  const failedLogs = logs.filter((l) => l.status === "FAILED");

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/whatsapp" className="hover:text-[var(--na-accent)]">
          WhatsApp
        </Link>
        <span>/</span>
        <span className="text-[var(--na-text)]">
          {batch.template?.name ?? `Batch ${id.slice(0, 8)}`}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            {batch.template?.name ?? `Batch ${id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Created {new Date(batch.createdAt).toLocaleString()}
          </p>
        </div>
        {failedLogs.length > 0 && (
          <button
            type="button"
            disabled={retrying}
            onClick={() => void handleRetryFailed()}
            className="shrink-0 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
          >
            {retrying ? "Retrying…" : `Retry ${failedLogs.length} Failed`}
          </button>
        )}
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: batch.totalCount },
          { label: "Sent", value: batch.sentCount, color: "text-sky-400" },
          { label: "Delivered", value: batch.deliveredCount, color: "text-emerald-400" },
          { label: "Failed", value: batch.failedCount, color: "text-rose-400" },
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

      {/* Progress Bars */}
      <div className="space-y-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--na-muted)]">
            <span>Sent Progress</span>
            <span>{sentPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${sentPct}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--na-muted)]">
            <span>Delivery Rate</span>
            <span>{deliveryPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${deliveryPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Message Logs Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Message Logs
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--na-muted)]">No messages in this batch.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--na-border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--na-muted)]">
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent At</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-b border-[var(--na-border-subtle)] last:border-0 ${
                      i % 2 === 0 ? "" : "bg-[var(--na-surface)]/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-[var(--na-text)]">
                      <div>{log.recipientName ?? "—"}</div>
                      <div className="text-xs text-[var(--na-muted)]">{log.recipientPhone}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[var(--na-muted)]">
                      <span className="line-clamp-2">{log.content}</span>
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
                    <td className="px-4 py-3 text-xs text-rose-400">
                      {log.errorMessage ?? "—"}
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
