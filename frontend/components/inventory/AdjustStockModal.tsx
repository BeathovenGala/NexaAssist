"use client";

import { useEffect, useState } from "react";
import { postMovementAdjust } from "@/lib/store/inventory";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

export function AdjustStockModal({
  itemId,
  itemName,
  currentQty,
  open,
  onClose,
  onDone,
}: {
  itemId: string;
  itemName: string;
  currentQty: number;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const showToast = useToastStore((s) => s.show);
  const [newQty, setNewQty] = useState(String(currentQty));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewQty(String(currentQty));
    }
  }, [open, currentQty]);

  if (!open) return null;

  async function submit() {
    const n = Number(newQty);
    if (!Number.isFinite(n) || n < 0) {
      showToast("Enter a valid new quantity", "error");
      return;
    }
    setLoading(true);
    try {
      await postMovementAdjust({
        itemId,
        newQuantity: n,
        reason: reason || undefined,
      });
      showToast("Stock adjusted", "info");
      onDone();
      onClose();
    } catch (e) {
      showToast(apiErrorMessage(e, "Adjustment failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="na-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="na-glass-card w-full max-w-md rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--na-text)]">Adjust quantity</h2>
        <p className="mt-1 text-sm text-[var(--na-muted)]">{itemName}</p>
        <p className="mt-2 text-xs text-[var(--na-muted)]">Current on hand: {currentQty}</p>
        <label className="mt-4 block text-xs font-bold uppercase text-[var(--na-muted)]">
          New quantity
          <input
            className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase text-[var(--na-muted)]">
          Reason
          <input
            className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            {loading ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
