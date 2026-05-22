"use client";

import { useState } from "react";
import { createRestockRequest } from "@/lib/store/inventory";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

export function RestockRequestModal({
  itemId,
  itemName,
  open,
  onClose,
  onDone,
}: {
  itemId: string;
  itemName: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const showToast = useToastStore((s) => s.show);
  const [qty, setQty] = useState("20");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 1) {
      showToast("Enter a valid quantity", "error");
      return;
    }
    setLoading(true);
    try {
      await createRestockRequest({
        itemId,
        quantityRequested: n,
        reason: reason || undefined,
      });
      showToast("Restock request submitted", "info");
      onDone();
      onClose();
    } catch (e) {
      showToast(apiErrorMessage(e, "Request failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="na-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="na-glass-card w-full max-w-md rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--na-text)]">Request restock</h2>
        <p className="mt-1 text-sm text-[var(--na-muted)]">{itemName}</p>
        <label className="mt-4 block text-xs font-bold uppercase text-[var(--na-muted)]">
          Quantity needed
          <input
            className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase text-[var(--na-muted)]">
          Reason
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Context for the manager"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-muted)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            className="na-btn-primary px-4 py-2 text-sm"
            onClick={() => void submit()}
          >
            {loading ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
