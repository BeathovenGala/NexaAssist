"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { apiDelete, apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

type BlockedRow = {
  id: string;
  staffId: string;
  reason: string | null;
  blockedFrom: string;
  blockedTo: string;
};

const BLOCK_TYPES = ["VACATION", "EMERGENCY", "BREAK", "MEETING"] as const;

export function parseBlockedMeta(reason: string | null): {
  type: (typeof BLOCK_TYPES)[number] | null;
  note: string;
} {
  if (!reason?.trim()) return { type: null, note: "" };
  const m = /^\[(VACATION|EMERGENCY|BREAK|MEETING)\]\s*(.*)$/i.exec(reason.trim());
  if (!m) return { type: null, note: reason };
  const t = m[1].toUpperCase() as (typeof BLOCK_TYPES)[number];
  return BLOCK_TYPES.includes(t) ? { type: t, note: m[2]?.trim() ?? "" } : { type: null, note: reason };
}

function badgeClass(type: string | null): string {
  switch (type) {
    case "VACATION":
      return "border-[color-mix(in_srgb,#6b9cff_35%,transparent)] bg-[color-mix(in_srgb,#6b9cff_12%,transparent)] text-[var(--na-accent)]";
    case "EMERGENCY":
      return "border-[color-mix(in_srgb,#e85b5b_45%,transparent)] bg-[color-mix(in_srgb,#e85b5b_12%,transparent)] text-[color-mix(in_srgb,#e85b5b_90%,var(--na-text))]";
    case "BREAK":
      return "border-[color-mix(in_srgb,var(--na-cyan)_35%,transparent)] bg-[color-mix(in_srgb,var(--na-cyan)_10%,transparent)] text-[var(--na-cyan)]";
    case "MEETING":
      return "border-[var(--na-border)] bg-[var(--na-surface-2)] text-[var(--na-muted)]";
    default:
      return "border-[var(--na-border)] bg-[var(--na-bg-deep)] text-[var(--na-muted)]";
  }
}

export function LeaveManager({ staffId }: { staffId: string }) {
  const toast = useToastStore();
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [blockedType, setBlockedType] = useState<(typeof BLOCK_TYPES)[number]>("BREAK");
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fromD = new Date();
      fromD.setUTCDate(fromD.getUTCDate() - 1);
      const toD = new Date();
      toD.setUTCDate(toD.getUTCDate() + 90);
      const list = await apiGet<BlockedRow[]>("/availability/blocked", {
        staffId,
        from: fromD.toISOString(),
        to: toD.toISOString(),
      });
      setRows(list);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load leave / blocks"), "error");
    } finally {
      setLoading(false);
    }
  }, [staffId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addBlock() {
    if (!dateFrom || !dateTo) {
      toast.show("Date from and to are required", "error");
      return;
    }
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T23:59:59.999`);
    if (from >= to) {
      toast.show("End date must be on or after start date", "error");
      return;
    }
    try {
      await apiPost("/availability/blocked", {
        staffId,
        blockedType,
        reason: reason.trim() || undefined,
        blockedFrom: from.toISOString(),
        blockedTo: to.toISOString(),
      });
      toast.show("Blocked time added", "info");
      setDateFrom("");
      setDateTo("");
      setReason("");
      await refresh();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Could not add block"), "error");
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/availability/blocked/${id}`);
      toast.show("Removed", "info");
      await refresh();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Delete failed"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="na-card border border-[var(--na-border-subtle)] p-5">
        <h3 className="text-sm font-semibold text-[var(--na-text)]">Add blocked time</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-[var(--na-muted)]">
            From (date)
            <input
              type="date"
              className="na-input mt-1 w-full"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            To (date)
            <input
              type="date"
              className="na-input mt-1 w-full"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            Type
            <select
              className="na-input mt-1 w-full"
              value={blockedType}
              onChange={(e) =>
                setBlockedType(e.target.value as (typeof BLOCK_TYPES)[number])
              }
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-full text-xs text-[var(--na-muted)] sm:col-span-2 lg:col-span-4">
            Reason (optional)
            <input
              className="na-input mt-1 w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Conference, clinic closed, …"
            />
          </label>
        </div>
        <button
          type="button"
          className="na-btn-primary mt-4 px-4 py-2 text-sm"
          disabled={loading}
          onClick={() => void addBlock()}
        >
          Add block
        </button>
      </div>

      <div className="na-card border border-[var(--na-border-subtle)] p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--na-text)]">Upcoming blocks</h3>
          <button
            type="button"
            className="text-xs text-[var(--na-accent)] hover:underline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <li className="text-sm text-[var(--na-muted)]">No blocked periods in range.</li>
          ) : (
            rows.map((b) => {
              const meta = parseBlockedMeta(b.reason);
              const label = meta.type ?? "Block";
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(meta.type)}`}
                    >
                      {label}
                    </span>
                    <span className="text-sm text-[var(--na-text)]">
                      {format(parseISO(b.blockedFrom), "MMM d, yyyy HH:mm")} –{" "}
                      {format(parseISO(b.blockedTo), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                  {meta.note ? (
                    <p className="text-xs text-[var(--na-muted)] sm:max-w-[40%] sm:truncate">
                      {meta.note}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="shrink-0 self-start text-xs text-[var(--na-muted)] hover:text-[color-mix(in_srgb,#e85b5b_85%,var(--na-text))] sm:self-center"
                    onClick={() => void remove(b.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
