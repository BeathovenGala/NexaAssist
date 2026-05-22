"use client";

import { addDays, format } from "date-fns";

export function ScheduleSidebar({
  anchorDate,
  onChange,
}: {
  anchorDate: string;
  onChange: (isoDate: string) => void;
}) {
  const d = new Date(`${anchorDate}T12:00:00.000Z`);
  return (
    <aside className="na-card w-full shrink-0 space-y-3 border border-[var(--na-border-subtle)] p-4 lg:w-56">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--na-muted)]">
        Navigator
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md border border-[var(--na-border)] px-2 py-1.5 text-xs text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() =>
            onChange(format(addDays(d, -7), "yyyy-MM-dd"))
          }
        >
          −7d
        </button>
        <button
          type="button"
          className="flex-1 rounded-md border border-[var(--na-border)] px-2 py-1.5 text-xs text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() =>
            onChange(format(addDays(d, 7), "yyyy-MM-dd"))
          }
        >
          +7d
        </button>
      </div>
      <input
        type="date"
        className="na-input text-xs"
        value={anchorDate}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[11px] leading-relaxed text-[var(--na-muted)]">
        Operational calendar uses UTC day boundaries for week/month aggregation.
      </p>
    </aside>
  );
}
