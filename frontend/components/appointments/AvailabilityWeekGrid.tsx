"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

type RecurringRow = {
  id: string;
  staffId: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  recurrenceType: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

const START_HOUR = 7;
const END_HOUR = 20;
const SLOT_MIN = 30;
const COL_DOW = [1, 2, 3, 4, 5, 6, 0] as const;
const COL_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toMin(h: number, m: number): number {
  return h * 60 + m;
}

function ruleSpan(r: RecurringRow): { start: number; end: number } {
  return {
    start: toMin(r.startHour, r.startMinute),
    end: toMin(r.endHour, r.endMinute),
  };
}

function coversCell(r: RecurringRow, dow: number, cellStart: number, cellEnd: number): boolean {
  if (r.dayOfWeek !== dow) return false;
  const { start, end } = ruleSpan(r);
  return start <= cellStart && end >= cellEnd;
}

function findRuleForCell(rules: RecurringRow[], dow: number, cellStart: number, cellEnd: number): RecurringRow | null {
  return rules.find((r) => coversCell(r, dow, cellStart, cellEnd)) ?? null;
}

export function AvailabilityWeekGrid({ staffId }: { staffId: string }) {
  const toast = useToastStore();
  const [rules, setRules] = useState<RecurringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const rows = useMemo(() => {
    const out: { label: string; startMin: number; endMin: number }[] = [];
    for (let min = START_HOUR * 60; min < END_HOUR * 60; min += SLOT_MIN) {
      const startMin = min;
      const endMin = min + SLOT_MIN;
      const h = Math.floor(min / 60);
      const m = min % 60;
      const label = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
      out.push({ label, startMin, endMin });
    }
    return out;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<RecurringRow[]>("/availability/recurring", { staffId });
      setRules(r);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load availability"), "error");
    } finally {
      setLoading(false);
    }
  }, [staffId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleCell(dow: number, cellStart: number, cellEnd: number) {
    const existing = findRuleForCell(rules, dow, cellStart, cellEnd);
    try {
      if (existing) {
        await apiDelete(`/availability/recurring/${existing.id}`);
        toast.show("Removed slot", "info");
      } else {
        const sh = Math.floor(cellStart / 60);
        const sm = cellStart % 60;
        const eh = Math.floor(cellEnd / 60);
        const em = cellEnd % 60;
        await apiPost("/availability", {
          kind: "recurring",
          recurring: {
            staffId,
            dayOfWeek: dow,
            startHour: sh,
            startMinute: sm,
            endHour: eh,
            endMinute: em,
            recurrenceType: "WEEKLY",
            effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString(),
          },
        });
        toast.show("Added slot", "info");
      }
      await refresh();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Update failed"), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-[var(--na-muted)]">
          Rules effective from
          <input
            type="date"
            className="na-input mt-1"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--na-border-subtle)]">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `80px repeat(${COL_DOW.length}, minmax(0,1fr))` }}
        >
          <div />
          {COL_LABEL.map((l) => (
            <div
              key={l}
              className="border-b border-l border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--na-muted)]"
            >
              {l}
            </div>
          ))}
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <div className="border-b border-[var(--na-border-subtle)] py-1 pr-2 text-right text-[10px] text-[var(--na-muted)]">
                {row.label}
              </div>
              {COL_DOW.map((dow) => {
                const on = findRuleForCell(rules, dow, row.startMin, row.endMin);
                return (
                  <button
                    key={`${row.label}-${dow}`}
                    type="button"
                    disabled={loading}
                    onClick={() => void toggleCell(dow, row.startMin, row.endMin)}
                    className={`min-h-[28px] border-b border-l border-[var(--na-border-subtle)] text-[10px] transition ${
                      on
                        ? "bg-[color-mix(in_srgb,var(--na-cyan)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--na-cyan)_28%,transparent)]"
                        : "bg-[var(--na-surface)] hover:bg-[var(--na-surface-2)]"
                    }`}
                    title={on ? "Click to remove" : "Click to add"}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--na-muted)]">
        Weekly template: each cell is {SLOT_MIN} minutes. Matches server recurring rules (UTC weekday
        index 0=Sun … 6=Sat).
      </p>
    </div>
  );
}
