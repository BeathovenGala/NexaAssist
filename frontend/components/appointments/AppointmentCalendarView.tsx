"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { AppointmentListItem } from "@/lib/types/scheduling";

const WEEK_OPTS = { weekStartsOn: 1 as const };

export function AppointmentCalendarView({
  month,
  onMonthChange,
  items,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  items: AppointmentListItem[];
}) {
  const start = startOfWeek(startOfMonth(month), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(month), WEEK_OPTS);
  const days = eachDayOfInterval({ start, end });

  function apptsForDay(d: Date) {
    return items.filter((a) => isSameDay(new Date(a.startTime), d));
  }

  return (
    <div className="na-card border border-[var(--na-border-subtle)] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm"
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          Prev
        </button>
        <h2 className="text-sm font-semibold text-[var(--na-text)]">{format(month, "MMMM yyyy")}</h2>
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg bg-[var(--na-border-subtle)] text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--na-muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-[var(--na-bg-deep)] py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-px grid grid-cols-7 gap-px rounded-b-lg bg-[var(--na-border-subtle)]">
        {days.map((d) => {
          const muted = !isSameMonth(d, month);
          const list = apptsForDay(d);
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[88px] bg-[var(--na-surface)] p-1.5 text-left ${
                muted ? "opacity-40" : ""
              }`}
            >
              <span className="text-[11px] font-medium text-[var(--na-text)]">{format(d, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ring-1 ring-inset ${
                      a.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-100 ring-amber-500/25"
                        : a.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-100 ring-emerald-500/25"
                          : a.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-100 ring-rose-500/25"
                            : "bg-zinc-600/30 text-zinc-200 ring-zinc-500/20"
                    }`}
                    title={a.title}
                  >
                    {format(new Date(a.startTime), "HH:mm")} {a.title}
                  </div>
                ))}
                {list.length > 3 && (
                  <p className="text-[9px] text-[var(--na-muted)]">+{list.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
