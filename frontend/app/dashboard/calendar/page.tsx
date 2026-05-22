"use client";

import { useEffect, useState } from "react";
import { useCalendarStore } from "@/lib/store/calendar";
import { CalendarGrid } from "@/components/appointments/CalendarGrid";
import { ScheduleSidebar } from "@/components/appointments/ScheduleSidebar";
import { apiGet } from "@/lib/apiEnvelope";

const CALENDAR_STAFF_STORAGE_KEY = "nexaassist.calendarStaffId";

type StaffOption = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  userCode: string;
  roles: string[];
};

export default function CalendarPage() {
  const {
    view,
    anchorDate,
    staffId,
    data,
    loading,
    error,
    setView,
    setAnchorDate,
    setStaffId,
    fetchRange,
  } = useCalendarStore();

  const [staffRows, setStaffRows] = useState<StaffOption[]>([]);
  const [staffLoadError, setStaffLoadError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRange();
  }, [fetchRange, view, anchorDate, staffId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiGet<StaffOption[]>("/appointments/bookable-staff");
        if (cancelled) {
          return;
        }
        setStaffRows(rows);
        setStaffLoadError(null);
        const saved =
          typeof window !== "undefined"
            ? window.localStorage.getItem(CALENDAR_STAFF_STORAGE_KEY)
            : null;
        if (saved && rows.some((r) => r.id === saved)) {
          setStaffId(saved);
        } else if (saved) {
          window.localStorage.removeItem(CALENDAR_STAFF_STORAGE_KEY);
        }
      } catch {
        if (!cancelled) {
          setStaffRows([]);
          setStaffLoadError("Could not load staff list.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setStaffId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
            Day, week, and month views. Optionally pick a staff member to filter appointments and
            match availability overlays.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                view === v
                  ? "border-[color-mix(in_srgb,var(--na-cyan)_45%,transparent)] bg-[color-mix(in_srgb,var(--na-cyan)_10%,transparent)] text-[var(--na-text)]"
                  : "border-[var(--na-border)] text-[var(--na-muted)] hover:bg-[var(--na-surface-2)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <ScheduleSidebar anchorDate={anchorDate} onChange={setAnchorDate} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="max-w-md">
            <label className="block text-xs text-[var(--na-muted)]" htmlFor="calendar-staff">
              Staff filter
            </label>
            <select
              id="calendar-staff"
              className="na-input mt-1 w-full"
              value={staffId ?? ""}
              onChange={(e) => {
                const v = e.target.value || undefined;
                setStaffId(v);
                if (typeof window === "undefined") {
                  return;
                }
                if (v) {
                  window.localStorage.setItem(CALENDAR_STAFF_STORAGE_KEY, v);
                } else {
                  window.localStorage.removeItem(CALENDAR_STAFF_STORAGE_KEY);
                }
              }}
            >
              <option value="">All staff</option>
              {staffRows.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName ?? ""} — {u.email}
                </option>
              ))}
            </select>
            {staffLoadError && (
              <p className="mt-1 text-xs text-amber-400" role="alert">
                {staffLoadError}
              </p>
            )}
          </div>
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}
          {loading && <p className="text-sm text-[var(--na-muted)]">Loading calendar…</p>}
          {data && !loading && <CalendarGrid payload={data} view={view} />}
        </div>
      </div>
    </div>
  );
}
