"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import Link from "next/link";
import type { CalendarPayload } from "@/lib/types/scheduling";
import { StatusBadge } from "./StatusBadge";

export function CalendarGrid({
  payload,
  view,
}: {
  payload: CalendarPayload;
  view: "day" | "week" | "month";
}) {
  const from = parseISO(payload.range.from);
  const to = parseISO(payload.range.to);
  const days =
    view === "month"
      ? eachDayOfInterval({ start: from, end: addDays(to, -1) })
      : eachDayOfInterval({ start: from, end: addDays(to, -1) });

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppts = payload.appointments.filter((a) =>
          isSameDay(parseISO(a.startTime), day),
        );
        const dayAvail = (payload.availabilitySlots ?? []).filter((s) => {
          const a = parseISO(s.startTime);
          const b = parseISO(s.endTime);
          return a < endOfDay(day) && b > startOfDay(day);
        });
        const dayBlocked = (payload.blockedSlots ?? []).filter((bl) => {
          const bf = parseISO(bl.blockedFrom);
          const bt = parseISO(bl.blockedTo);
          return bf < endOfDay(day) && bt > startOfDay(day);
        });
        return (
          <div
            key={day.toISOString()}
            className="na-card min-h-[160px] border border-[var(--na-border-subtle)] p-3"
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--na-border-subtle)] pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--na-muted)]">
                {format(day, "EEE")}
              </p>
              <p className="text-sm font-semibold text-[var(--na-text)]">{format(day, "d")}</p>
            </div>

            {(dayAvail.length > 0 || dayBlocked.length > 0) && (
              <div className="mt-2 space-y-1.5 border-b border-[var(--na-border-subtle)] pb-2">
                {dayAvail.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border border-[color-mix(in_srgb,#34d399_35%,transparent)] bg-[color-mix(in_srgb,#34d399_10%,transparent)] px-2 py-1 text-[10px] text-[color-mix(in_srgb,#6ee7b7_90%,var(--na-text))]"
                    title="Working / available"
                  >
                    {format(parseISO(s.startTime), "HH:mm")}–{format(parseISO(s.endTime), "HH:mm")}{" "}
                    <span className="text-[var(--na-muted)]">available</span>
                  </div>
                ))}
                {dayBlocked.map((b) => (
                  <div
                    key={b.id}
                    className="rounded border border-[color-mix(in_srgb,#e85b5b_35%,transparent)] bg-[color-mix(in_srgb,#e85b5b_10%,transparent)] px-2 py-1 text-[10px] text-[color-mix(in_srgb,#fca5a5_90%,var(--na-text))]"
                    title={b.reason ?? "Blocked"}
                  >
                    {format(parseISO(b.blockedFrom), "HH:mm")}–{format(parseISO(b.blockedTo), "HH:mm")}{" "}
                    <span className="text-[var(--na-muted)]">blocked</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {dayAppts.length === 0 ? (
                <p className="text-[11px] text-[var(--na-muted)]">No appointments</p>
              ) : (
                dayAppts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/appointments/${a.id}`}
                    className="block rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-2 text-[11px] transition hover:border-[var(--na-accent)]/35"
                  >
                    <p className="truncate font-medium text-[var(--na-text)]">{a.title}</p>
                    <p className="mt-1 text-[10px] text-[var(--na-muted)]">
                      {format(parseISO(a.startTime), "HH:mm")} –{" "}
                      {format(parseISO(a.endTime), "HH:mm")}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
