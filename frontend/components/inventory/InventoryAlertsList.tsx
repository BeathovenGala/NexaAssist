"use client";

import { useState } from "react";
import type { InventoryAlertRow } from "@/lib/types/inventory";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { acknowledgeAlert, markAlertRead, resolveAlert } from "@/lib/store/inventory";
import { useToastStore } from "@/lib/store/toast";

export function InventoryAlertsList({
  rows,
  loading,
  canManage,
}: {
  rows: InventoryAlertRow[];
  loading: boolean;
  canManage: boolean;
}) {
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<void>, ok: string) {
    setBusy(id);
    try {
      await fn();
      showToast(ok, "info");
      window.location.reload();
    } catch (e) {
      showToast(apiErrorMessage(e, "Action failed"), "error");
    } finally {
      setBusy(null);
    }
  }

  if (loading && rows.length === 0) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }
  if (!rows.length) {
    return <p className="text-sm text-[var(--na-muted)]">No alerts.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((a) => (
        <li
          key={a.id}
          className="flex flex-col gap-2 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-[var(--na-accent)]">{a.type}</span>
              <span className="text-[10px] font-bold uppercase text-[var(--na-muted)]">{a.severity}</span>
              <span className="text-[10px] font-bold uppercase text-[var(--na-muted)]">{a.status}</span>
              {!a.isRead ? (
                <span className="rounded bg-[var(--na-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--na-accent)]">
                  Unread
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--na-text)]">{a.message}</p>
            <p className="text-xs text-[var(--na-muted)]">
              {a.item.name} · Qty {a.item.quantity} · {new Date(a.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy === a.id}
              className="rounded border border-[var(--na-border)] px-2 py-1 text-xs text-[var(--na-muted)] hover:bg-[var(--na-surface)]"
              onClick={() => void run(a.id, () => markAlertRead(a.id), "Marked read")}
            >
              Read
            </button>
            {canManage ? (
              <>
                <button
                  type="button"
                  disabled={busy === a.id}
                  className="rounded border border-[var(--na-border)] px-2 py-1 text-xs text-[var(--na-muted)] hover:bg-[var(--na-surface)]"
                  onClick={() => void run(a.id, () => acknowledgeAlert(a.id), "Acknowledged")}
                >
                  Ack
                </button>
                <button
                  type="button"
                  disabled={busy === a.id}
                  className="na-btn-primary px-2 py-1 text-xs"
                  onClick={() => void run(a.id, () => resolveAlert(a.id), "Resolved")}
                >
                  Resolve
                </button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
