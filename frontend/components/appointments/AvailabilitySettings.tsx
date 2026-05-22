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

const ROW_ORDER: { dow: number; label: string }[] = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRuleTime(r: RecurringRow): string {
  return `${pad2(r.startHour)}:${pad2(r.startMinute)} → ${pad2(r.endHour)}:${pad2(r.endMinute)}`;
}

export function AvailabilitySettings({ staffId }: { staffId: string }) {
  const toast = useToastStore();
  const [rules, setRules] = useState<RecurringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [addByDay, setAddByDay] = useState<
    Record<number, { sh: number; sm: number; eh: number; em: number }>
  >(() =>
    Object.fromEntries(
      ROW_ORDER.map(({ dow }) => [
        dow,
        { sh: 9, sm: 0, eh: 17, em: 0 },
      ]),
    ),
  );

  const byDay = useMemo(() => {
    const m = new Map<number, RecurringRow[]>();
    for (const r of rules) {
      const list = m.get(r.dayOfWeek) ?? [];
      list.push(r);
      m.set(r.dayOfWeek, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
    }
    return m;
  }, [rules]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<RecurringRow[]>("/availability/recurring", { staffId });
      setRules(r);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load schedule"), "error");
    } finally {
      setLoading(false);
    }
  }, [staffId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function removeRule(id: string) {
    try {
      await apiDelete(`/availability/recurring/${id}`);
      toast.show("Removed", "info");
      await refresh();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Remove failed"), "error");
    }
  }

  async function addRule(dow: number) {
    const v = addByDay[dow] ?? { sh: 9, sm: 0, eh: 17, em: 0 };
    if (v.eh * 60 + v.em <= v.sh * 60 + v.sm) {
      toast.show("End time must be after start time", "error");
      return;
    }
    try {
      await apiPost("/availability", {
        kind: "recurring",
        recurring: {
          staffId,
          dayOfWeek: dow,
          startHour: v.sh,
          startMinute: v.sm,
          endHour: v.eh,
          endMinute: v.em,
          recurrenceType: "WEEKLY",
          effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString(),
        },
      });
      toast.show("Window added", "info");
      await refresh();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Add failed"), "error");
    }
  }

  function setAddField(
    dow: number,
    patch: Partial<{ sh: number; sm: number; eh: number; em: number }>,
  ) {
    setAddByDay((prev) => ({
      ...prev,
      [dow]: { ...(prev[dow] ?? { sh: 9, sm: 0, eh: 17, em: 0 }), ...patch },
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-[var(--na-muted)]">
          New rules effective from
          <input
            type="date"
            className="na-input mt-1"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <p className="text-xs text-[var(--na-muted)]">
        Weekly template (UTC weekday index matches server: Sun = 0 … Sat = 6). Each row is one or
        more working windows for that day.
      </p>

      <div className="space-y-3">
        {ROW_ORDER.map(({ dow, label }) => {
          const dayRules = byDay.get(dow) ?? [];
          const add = addByDay[dow] ?? { sh: 9, sm: 0, eh: 17, em: 0 };
          return (
            <div
              key={dow}
              className="na-card flex flex-col gap-3 border border-[var(--na-border-subtle)] p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-[120px]">
                <p className="text-sm font-semibold text-[var(--na-text)]">{label}</p>
                {dayRules.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--na-muted)]">Off</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {dayRules.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] px-2 py-1.5 text-xs"
                      >
                        <span className="font-mono text-[var(--na-text)]">{formatRuleTime(r)}</span>
                        <button
                          type="button"
                          className="shrink-0 text-[var(--na-muted)] hover:text-[color-mix(in_srgb,#e85b5b_80%,var(--na-text))]"
                          onClick={() => void removeRule(r.id)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-[var(--na-border-subtle)] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <label className="text-[10px] text-[var(--na-muted)]">
                  From (h)
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="na-input mt-0.5 w-14"
                    value={add.sh}
                    onChange={(e) => setAddField(dow, { sh: Number(e.target.value) })}
                  />
                </label>
                <label className="text-[10px] text-[var(--na-muted)]">
                  m
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    className="na-input mt-0.5 w-14"
                    value={add.sm}
                    onChange={(e) => setAddField(dow, { sm: Number(e.target.value) })}
                  />
                </label>
                <span className="pb-1 text-[var(--na-muted)]">→</span>
                <label className="text-[10px] text-[var(--na-muted)]">
                  To (h)
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="na-input mt-0.5 w-14"
                    value={add.eh}
                    onChange={(e) => setAddField(dow, { eh: Number(e.target.value) })}
                  />
                </label>
                <label className="text-[10px] text-[var(--na-muted)]">
                  m
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    className="na-input mt-0.5 w-14"
                    value={add.em}
                    onChange={(e) => setAddField(dow, { em: Number(e.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  className="na-btn-primary px-3 py-2 text-xs"
                  disabled={loading}
                  onClick={() => void addRule(dow)}
                >
                  Add window
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
