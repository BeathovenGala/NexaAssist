"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
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

type BlockedRow = {
  id: string;
  staffId: string;
  reason: string | null;
  blockedFrom: string;
  blockedTo: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilityGrid({
  staffId,
  onChanged,
}: {
  staffId: string;
  onChanged?: () => void;
}) {
  const toast = useToastStore();
  const [rules, setRules] = useState<RecurringRow[]>([]);
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");
  const [bReason, setBReason] = useState("");

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on staff change
  }, [staffId]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await apiGet<RecurringRow[]>("/availability/recurring", { staffId });
      setRules(r);
      const fromD = new Date();
      fromD.setUTCDate(fromD.getUTCDate() - 1);
      const toD = new Date();
      toD.setUTCDate(toD.getUTCDate() + 14);
      const blk = await apiGet<BlockedRow[]>("/availability/blocked", {
        staffId,
        from: fromD.toISOString(),
        to: toD.toISOString(),
      });
      setBlocked(blk);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load availability"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function addRule() {
    try {
      await apiPost("/availability", {
        kind: "recurring",
        recurring: {
          staffId,
          dayOfWeek,
          startHour,
          endHour,
          recurrenceType: "WEEKLY",
          effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString(),
        },
      });
      toast.show("Recurring rule added", "info");
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to add rule"), "error");
    }
  }

  async function addBlock() {
    if (!bFrom || !bTo) {
      toast.show("Blocked from/to required", "error");
      return;
    }
    try {
      await apiPost("/availability/blocked", {
        staffId,
        reason: bReason || undefined,
        blockedFrom: new Date(bFrom).toISOString(),
        blockedTo: new Date(bTo).toISOString(),
      });
      toast.show("Blocked slot added", "info");
      setBFrom("");
      setBTo("");
      setBReason("");
      await refresh();
      onChanged?.();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to add block"), "error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="na-card border border-[var(--na-border-subtle)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--na-text)]">Weekly hours</h3>
          <button
            type="button"
            className="text-xs text-[var(--na-accent)] hover:underline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--na-muted)]">
            Day
            <select
              className="na-input mt-1"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            Effective from
            <input
              type="date"
              className="na-input mt-1"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            Start hour
            <input
              type="number"
              min={0}
              max={23}
              className="na-input mt-1"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            End hour
            <input
              type="number"
              min={0}
              max={23}
              className="na-input mt-1"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
            />
          </label>
        </div>
        <button type="button" className="na-btn-primary mt-4" onClick={() => void addRule()}>
          Add recurring rule
        </button>
        <ul className="mt-4 space-y-2 text-xs text-[var(--na-muted)]">
          {rules.map((r) => (
            <li key={r.id} className="rounded border border-[var(--na-border-subtle)] px-2 py-1">
              {DAYS[r.dayOfWeek]} {r.startHour}:00–{r.endHour}:00 ({r.recurrenceType})
            </li>
          ))}
        </ul>
      </div>

      <div className="na-card border border-[var(--na-border-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--na-text)]">Blocked time</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--na-muted)]">
            From (local)
            <input
              type="datetime-local"
              className="na-input mt-1"
              value={bFrom}
              onChange={(e) => setBFrom(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            To (local)
            <input
              type="datetime-local"
              className="na-input mt-1"
              value={bTo}
              onChange={(e) => setBTo(e.target.value)}
            />
          </label>
          <label className="col-span-full text-xs text-[var(--na-muted)]">
            Reason
            <input
              className="na-input mt-1"
              value={bReason}
              onChange={(e) => setBReason(e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="na-btn-primary mt-4" onClick={() => void addBlock()}>
          Add block
        </button>
        <ul className="mt-4 space-y-2 text-xs text-[var(--na-muted)]">
          {blocked.map((b) => (
            <li key={b.id} className="rounded border border-[var(--na-border-subtle)] px-2 py-1">
              {b.reason ?? "Blocked"} · {new Date(b.blockedFrom).toLocaleString()} –{" "}
              {new Date(b.blockedTo).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
