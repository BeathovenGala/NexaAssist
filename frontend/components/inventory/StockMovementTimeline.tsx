import type { StockMovementRow } from "@/lib/types/inventory";

export function StockMovementTimeline({ movements }: { movements: StockMovementRow[] }) {
  if (!movements.length) {
    return <p className="text-sm text-[var(--na-muted)]">No movements yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {movements.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-1 rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <span className="font-semibold text-[var(--na-text)]">{m.movementType}</span>
            <span className="mx-2 text-[var(--na-muted)]">·</span>
            <span className="text-[var(--na-muted)]">
              {m.item.name} ({m.item.sku})
            </span>
            <p className="text-xs text-[var(--na-muted)]">
              {m.previousQuantity} → {m.newQuantity} (Δ {m.newQuantity - m.previousQuantity >= 0 ? "+" : ""}
              {m.newQuantity - m.previousQuantity})
            </p>
            {m.reason ? (
              <p className="text-xs italic text-[var(--na-muted)]">{m.reason}</p>
            ) : null}
          </div>
          <div className="text-right text-xs text-[var(--na-muted)]">
            <div>
              {m.performedBy.firstName} {m.performedBy.lastName ?? ""}
            </div>
            <div className="font-mono text-[10px]">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
