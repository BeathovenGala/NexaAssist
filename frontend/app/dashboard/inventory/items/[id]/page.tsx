"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/apiEnvelope";
import type { InventoryItemListRow, InventoryRequestRow, Paginated, StockMovementRow } from "@/lib/types/inventory";
import { InventoryItemStatusBadge } from "@/components/inventory/InventoryItemStatusBadge";
import { StockMovementTimeline } from "@/components/inventory/StockMovementTimeline";
import { InventoryRequestsTable } from "@/components/inventory/InventoryRequestsTable";
import { AddStockModal } from "@/components/inventory/AddStockModal";
import { ConsumeStockModal } from "@/components/inventory/ConsumeStockModal";
import { AdjustStockModal } from "@/components/inventory/AdjustStockModal";
import { RestockRequestModal } from "@/components/inventory/RestockRequestModal";
import { hasPermission, useAuth } from "@/lib/auth";

export default function InventoryItemDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory:write");
  const canConsume = hasPermission(user, "inventory:consume");
  const canAdjust = hasPermission(user, "inventory:adjust");
  const canRequest = hasPermission(user, "inventory:request");
  const canApprove = hasPermission(user, "inventory:approve");

  const [item, setItem] = useState<InventoryItemListRow | null>(null);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [requests, setRequests] = useState<InventoryRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [modal, setModal] = useState<"in" | "out" | "adj" | "req" | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const [it, mov, req] = await Promise.all([
        apiGet<InventoryItemListRow>(`/inventory/items/${id}`),
        apiGet<Paginated<StockMovementRow>>(`/inventory/items/${id}/movements`, {
          skip: 0,
          take: 40,
        }),
        apiGet<Paginated<InventoryRequestRow>>("/inventory/requests", {
          skip: 0,
          take: 30,
          itemId: id,
        }),
      ]);
      setItem(it);
      setMovements(mov.items);
      setRequests(req.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !item) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }
  if (err || !item) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-rose-400">{err ?? "Not found"}</p>
        <Link href="/dashboard/inventory/items" className="text-sm text-[var(--na-accent)] hover:underline">
          Back to items
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/inventory/items"
            className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
          >
            ← Items
          </Link>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--na-text)]">{item.name}</h2>
          <p className="mt-1 font-mono text-sm text-[var(--na-muted)]">{item.sku}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InventoryItemStatusBadge status={item.status} />
            <span className="text-sm text-[var(--na-muted)]">
              Qty {item.quantity} · Available {item.availableQuantity} · Min {item.minimumThreshold}{" "}
              {item.unit}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <button type="button" className="na-btn-primary px-3 py-2 text-sm" onClick={() => setModal("in")}>
              Add stock
            </button>
          ) : null}
          {canConsume ? (
            <button
              type="button"
              className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-text)]"
              onClick={() => setModal("out")}
            >
              Consume
            </button>
          ) : null}
          {canAdjust ? (
            <button
              type="button"
              className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-text)]"
              onClick={() => setModal("adj")}
            >
              Adjust
            </button>
          ) : null}
          {canRequest ? (
            <button
              type="button"
              className={`rounded-md border px-3 py-2 text-sm ${
                item.status === "OUT_OF_STOCK" || item.status === "LOW"
                  ? "na-btn-primary border-transparent"
                  : "border-[var(--na-accent)]/40 text-[var(--na-accent)]"
              }`}
              onClick={() => setModal("req")}
            >
              {item.status === "OUT_OF_STOCK"
                ? "Request item (out of stock)"
                : item.status === "LOW"
                  ? "Request restock (low)"
                  : "Request restock"}
            </button>
          ) : null}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Movement history
        </h3>
        <StockMovementTimeline movements={movements} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Requests for this item
        </h3>
        <InventoryRequestsTable rows={requests} loading={false} canApprove={canApprove} />
      </section>

      <AddStockModal
        itemId={item.id}
        itemName={item.name}
        open={modal === "in"}
        onClose={() => setModal(null)}
        onDone={() => void load()}
      />
      <ConsumeStockModal
        itemId={item.id}
        itemName={item.name}
        open={modal === "out"}
        onClose={() => setModal(null)}
        onDone={() => void load()}
      />
      <AdjustStockModal
        itemId={item.id}
        itemName={item.name}
        currentQty={item.quantity}
        open={modal === "adj"}
        onClose={() => setModal(null)}
        onDone={() => void load()}
      />
      <RestockRequestModal
        itemId={item.id}
        itemName={item.name}
        open={modal === "req"}
        onClose={() => setModal(null)}
        onDone={() => void load()}
      />
    </div>
  );
}
