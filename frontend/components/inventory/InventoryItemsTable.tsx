import Link from "next/link";
import type { InventoryItemListRow } from "@/lib/types/inventory";
import { InventoryItemStatusBadge } from "./InventoryItemStatusBadge";

export function InventoryItemsTable({
  rows,
  loading,
}: {
  rows: InventoryItemListRow[];
  loading: boolean;
}) {
  if (loading && rows.length === 0) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }
  if (!rows.length) {
    return <p className="text-sm text-[var(--na-muted)]">No items match your filters.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[var(--na-border-subtle)] bg-[var(--na-surface)]/80 text-[10px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
          <tr>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Available</th>
            <th className="px-4 py-3">Min</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--na-border-subtle)]">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--na-surface)]/40">
              <td className="px-4 py-3 font-medium text-[var(--na-text)]">{r.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--na-muted)]">{r.sku}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--na-text)]">{r.quantity}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--na-text)]">{r.availableQuantity}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--na-muted)]">{r.minimumThreshold}</td>
              <td className="px-4 py-3">
                <InventoryItemStatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/dashboard/inventory/items/${r.id}`}
                  className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
