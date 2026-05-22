"use client";

import type { AppointmentHistoryEntry } from "@/lib/types/scheduling";
import { format } from "date-fns";

export function HistoryTimeline({ entries }: { entries: AppointmentHistoryEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-[var(--na-muted)]">No history yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-[var(--na-border-subtle)] pl-6">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] shadow-[0_0_0_4px_var(--na-bg)]" />
          <div className="na-card border border-[var(--na-border-subtle)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--na-accent)]">
                {e.actionType}
              </p>
              <p className="text-[11px] text-[var(--na-muted)]">
                {format(new Date(e.createdAt), "MMM d, yyyy HH:mm")}
              </p>
            </div>
            <p className="mt-2 text-xs text-[var(--na-muted)]">
              {e.performedBy.firstName} {e.performedBy.lastName ?? ""} · {e.performedBy.email}
            </p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-2 text-[10px] leading-relaxed text-[var(--na-muted)]">
              {JSON.stringify({ previous: e.previousValue, next: e.newValue }, null, 2)}
            </pre>
          </div>
        </li>
      ))}
    </ol>
  );
}
