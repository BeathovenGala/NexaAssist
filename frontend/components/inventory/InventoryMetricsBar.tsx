import type { InventoryDashboard } from "@/lib/types/inventory";

export function InventoryMetricsBar({ data }: { data: InventoryDashboard["metrics"] }) {
  const cards = [
    { label: "Total items", value: data.totalItems },
    { label: "Low / out", value: data.lowStockCount },
    { label: "Critical alerts", value: data.criticalAlerts },
    { label: "Pending requests", value: data.pendingRequests },
    { label: "Movements today", value: data.movementsToday },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/60 px-4 py-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--na-text)]">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
