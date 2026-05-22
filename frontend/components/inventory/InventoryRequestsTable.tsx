"use client";

import { useState } from "react";
import type { InventoryRequestRow } from "@/lib/types/inventory";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { approveRequest, fulfillRequest, rejectRequest } from "@/lib/store/inventory";
import { useToastStore } from "@/lib/store/toast";

export function InventoryRequestsTable({
  rows,
  loading,
  canApprove,
}: {
  rows: InventoryRequestRow[];
  loading: boolean;
  canApprove: boolean;
}) {
  const showToast = useToastStore((s) => s.show);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setBusy(id);
    try {
      await approveRequest(id, {});
      showToast("Request approved", "info");
      window.location.reload();
    } catch (e) {
      showToast(apiErrorMessage(e, "Approve failed"), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(id: string) {
    const note = window.prompt("Optional note for rejection?");
    setBusy(id);
    try {
      await rejectRequest(id, { managerNotes: note ?? undefined });
      showToast("Request rejected", "info");
      window.location.reload();
    } catch (e) {
      showToast(apiErrorMessage(e, "Reject failed"), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleFulfill(id: string, maxQty: number) {
    const raw = window.prompt(`Fulfill quantity (max ${maxQty}):`, String(maxQty));
    if (raw == null) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 1 || qty > maxQty) {
      showToast("Invalid quantity", "error");
      return;
    }
    setBusy(id);
    try {
      await fulfillRequest(id, { quantity: qty });
      showToast("Fulfillment recorded", "info");
      window.location.reload();
    } catch (e) {
      showToast(apiErrorMessage(e, "Fulfill failed"), "error");
    } finally {
      setBusy(null);
    }
  }

  if (loading && rows.length === 0) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }
  if (!rows.length) {
    return <p className="text-sm text-[var(--na-muted)]">No requests.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-[var(--na-border-subtle)] bg-[var(--na-surface)]/80 text-[10px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Requester</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Status</th>
            {canApprove ? <th className="px-3 py-2 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--na-border-subtle)]">
          {rows.map((r) => {
            const maxFulfill = (r.approvedQuantity ?? r.quantityRequested) - r.fulfilledQuantity;
            return (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-[var(--na-text)]">{r.item.name}</div>
                  <div className="text-xs text-[var(--na-muted)]">{r.reason ?? "—"}</div>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--na-muted)]">
                  {r.requestedBy.firstName} {r.requestedBy.lastName ?? ""}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {r.status === "APPROVED" || r.status === "FULFILLED" ? (
                    <span>
                      {r.fulfilledQuantity}/{r.approvedQuantity ?? r.quantityRequested}
                    </span>
                  ) : (
                    <span>{r.quantityRequested}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs uppercase text-[var(--na-muted)]">{r.priority}</td>
                <td className="px-3 py-2 text-xs font-semibold text-[var(--na-text)]">{r.status}</td>
                {canApprove ? (
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy === r.id}
                            className="na-btn-primary px-2 py-1 text-xs"
                            onClick={() => void handleApprove(r.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy === r.id}
                            className="rounded border border-[var(--na-border)] px-2 py-1 text-xs text-[var(--na-muted)] hover:bg-[var(--na-surface)]"
                            onClick={() => void handleReject(r.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {r.status === "APPROVED" && maxFulfill > 0 ? (
                        <button
                          type="button"
                          disabled={busy === r.id}
                          className="na-btn-primary px-2 py-1 text-xs"
                          onClick={() => void handleFulfill(r.id, maxFulfill)}
                        >
                          Fulfill
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
