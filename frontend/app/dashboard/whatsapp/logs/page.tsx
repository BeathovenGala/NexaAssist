"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { WhatsAppMessageLog, WhatsAppMessageStatus } from "@/lib/types/whatsapp";

const STATUS_FILTERS: { label: string; value: WhatsAppMessageStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Queued", value: "QUEUED" },
  { label: "Sent", value: "SENT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Failed", value: "FAILED" },
  { label: "Read", value: "READ" },
];

const MSG_STATUS_COLORS: Record<WhatsAppMessageStatus, string> = {
  QUEUED: "border-[var(--na-border)] text-[var(--na-muted)] bg-transparent",
  SENT: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  DELIVERED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  FAILED: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  READ: "border-purple-500/40 text-purple-300 bg-purple-500/10",
};

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WhatsAppMessageStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const data = await apiGet<WhatsAppMessageLog[]>("/whatsapp/logs", params);
      setLogs(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load logs"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(logId: string) {
    setRetryingId(logId);
    try {
      await apiPost(`/whatsapp/logs/${logId}/retry`, {});
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to retry message"));
    } finally {
      setRetryingId(null);
    }
  }

  const filtered = search
    ? logs.filter(
        (l) =>
          l.recipientPhone.includes(search) ||
          (l.recipientName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          l.content.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
          WhatsApp
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Message Logs
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          View and manage all outgoing WhatsApp messages
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by recipient or content…"
          className="flex-1 rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === f.value
                  ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
                  : "border-[var(--na-border)] text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50"
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
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-12 text-center">
          <p className="text-sm text-[var(--na-muted)]">No messages found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--na-border-subtle)] text-left text-xs uppercase tracking-wider text-[var(--na-muted)]">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Content</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent At</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-b border-[var(--na-border-subtle)] last:border-0 ${
                    i % 2 === 0 ? "" : "bg-[var(--na-surface)]/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--na-text)]">
                      {log.recipientName ?? log.recipientPhone}
                    </div>
                    {log.recipientName && (
                      <div className="text-xs text-[var(--na-muted)]">{log.recipientPhone}</div>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-[var(--na-muted)]">
                    <span className="line-clamp-2 text-xs">{log.content}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        MSG_STATUS_COLORS[log.status]
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--na-muted)]">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === "FAILED" && (
                      <button
                        type="button"
                        disabled={retryingId === log.id}
                        onClick={() => void handleRetry(log.id)}
                        className="rounded border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40"
                      >
                        {retryingId === log.id ? "…" : "Retry"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
