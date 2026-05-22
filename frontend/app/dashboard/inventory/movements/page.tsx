"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useInventoryStore } from "@/lib/store/inventory";
import { StockMovementTimeline } from "@/components/inventory/StockMovementTimeline";

export default function InventoryMovementsPage() {
  const { movements, movementsLoading, movementsError, fetchMovements, movementSkip, movementTake, setMovementPagination } =
    useInventoryStore();

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements, movementSkip, movementTake]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--na-text)]">Movement audit</h2>
      <p className="text-sm text-[var(--na-muted)]">Immutable history of stock changes.</p>
      {movementsError ? <p className="text-sm text-rose-400">{movementsError}</p> : null}
      <StockMovementTimeline movements={movements?.items ?? []} />
      {movements && movements.total > movementTake ? (
        <div className="flex justify-between text-sm text-[var(--na-muted)]">
          <button
            type="button"
            className="rounded border border-[var(--na-border)] px-3 py-1 text-xs disabled:opacity-40"
            disabled={movementSkip === 0}
            onClick={() =>
              setMovementPagination(Math.max(0, movementSkip - movementTake), movementTake)
            }
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-[var(--na-border)] px-3 py-1 text-xs disabled:opacity-40"
            disabled={movementSkip + movementTake >= movements.total}
            onClick={() => setMovementPagination(movementSkip + movementTake, movementTake)}
          >
            Next
          </button>
        </div>
      ) : null}
      {movementsLoading && !(movements?.items.length) ? (
        <p className="text-sm text-[var(--na-muted)]">Loading…</p>
      ) : null}
      <p className="text-center text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/inventory" className="text-[var(--na-accent)] hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
