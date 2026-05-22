"use client";

import { format } from "date-fns";
import type { FreeSlot, SlotPickerCard } from "@/lib/types/scheduling";

function sortCards(cards: SlotPickerCard[]): SlotPickerCard[] {
  return [...cards].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function SlotPicker({
  cards,
  selectedStart,
  onSelectAvailable,
  disabled,
}: {
  cards: SlotPickerCard[];
  selectedStart: string | null;
  onSelectAvailable: (slot: FreeSlot) => void;
  disabled?: boolean;
}) {
  const ordered = sortCards(cards);

  if (!ordered.length) {
    return (
      <p className="text-sm text-[var(--na-muted)]">No slots to display for this day.</p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((c) => {
        const start = new Date(c.startTime);
        const end = new Date(c.endTime);
        const timeLabel = `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
        const dayLabel = format(start, "EEE MMM d");

        if (c.kind === "available") {
          const active = selectedStart === c.startTime;
          return (
            <button
              key={`av-${c.startTime}`}
              type="button"
              disabled={disabled}
              onClick={() =>
                onSelectAvailable({ startTime: c.startTime, endTime: c.endTime })
              }
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-[color-mix(in_srgb,var(--na-cyan)_50%,transparent)] bg-[color-mix(in_srgb,var(--na-cyan)_14%,transparent)] text-[var(--na-text)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--na-cyan)_22%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--na-accent)_45%,transparent)] bg-[var(--na-bg-deep)] text-[var(--na-muted)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--na-cyan)_12%,transparent)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--na-accent)_65%,transparent)] hover:shadow-[0_0_12px_color-mix(in_srgb,var(--na-cyan)_18%,transparent)] hover:text-[var(--na-text)]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="block font-medium text-[var(--na-text)]">{timeLabel}</span>
              <span className="text-[11px] text-[var(--na-muted)]">{dayLabel}</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--na-cyan)]">
                Available
              </span>
            </button>
          );
        }

        if (c.kind === "booked") {
          return (
            <div
              key={`bk-${c.startTime}-${c.endTime}`}
              className="cursor-not-allowed rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] px-3 py-2.5 text-left text-sm opacity-40"
              title="Booked"
            >
              <span className="block font-medium text-[var(--na-text)]">{timeLabel}</span>
              <span className="text-[11px] text-[var(--na-muted)]">{dayLabel}</span>
              {c.title ? (
                <span className="mt-1 block truncate text-[10px] text-[var(--na-muted)]">
                  {c.title}
                </span>
              ) : (
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--na-muted)]">
                  Booked
                </span>
              )}
            </div>
          );
        }

        return (
          <div
            key={`bl-${c.startTime}-${c.endTime}`}
            className="cursor-not-allowed rounded-md border border-[color-mix(in_srgb,#e85b5b_30%,transparent)] bg-[color-mix(in_srgb,#e85b5b_10%,transparent)] px-3 py-2.5 text-left text-sm"
            title={c.reason ?? "Blocked"}
          >
            <span className="block font-medium text-[var(--na-text)]">{timeLabel}</span>
            <span className="text-[11px] text-[var(--na-muted)]">{dayLabel}</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-[color-mix(in_srgb,#e85b5b_85%,var(--na-text))]">
              Unavailable
            </span>
          </div>
        );
      })}
    </div>
  );
}
