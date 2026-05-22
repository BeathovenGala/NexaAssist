import type { InventoryItemStatus } from "@/lib/types/inventory";

const STYLES: Record<InventoryItemStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  LOW: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  OUT_OF_STOCK: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  ARCHIVED: "bg-[var(--na-muted)]/20 text-[var(--na-muted)] ring-[var(--na-border)]",
  EXPIRED: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  DAMAGED: "bg-rose-600/15 text-rose-200 ring-rose-600/30",
  RESTRICTED: "bg-violet-500/15 text-violet-200 ring-violet-500/30",
};

export function InventoryItemStatusBadge({ status }: { status: InventoryItemStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STYLES[status] ?? STYLES.ACTIVE}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
