"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppointmentsStore } from "@/lib/store/appointments";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";
import { AppointmentCalendarView } from "@/components/appointments/AppointmentCalendarView";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { localCalendarDayUtcIsoRange, todayLocalYmd } from "@/lib/localDay";

export default function AppointmentsListPage() {
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(() => new Date());
  const [todayOnly, setTodayOnly] = useState(true);
  const {
    items,
    total,
    skip,
    take,
    filters,
    loading,
    error,
    setFilters,
    setPagination,
    fetchList,
  } = useAppointmentsStore();

  useEffect(() => {
    if (todayOnly) {
      const { from, to } = localCalendarDayUtcIsoRange(todayLocalYmd());
      setFilters({ from, to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init today filter once
  }, []);

  useEffect(() => {
    void fetchList();
  }, [
    fetchList,
    skip,
    take,
    filters.status,
    filters.from,
    filters.to,
    filters.search,
    filters.staffId,
    filters.serviceTypeId,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Appointments</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
            Calendar overview and list with quick confirm / cancel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/booking"
            className="na-btn-primary inline-flex items-center justify-center px-4 py-2 text-sm no-underline"
          >
            New booking
          </Link>
          <div className="flex rounded-md border border-[var(--na-border)] p-0.5">
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                view === "month" ? "bg-[var(--na-surface-2)] text-[var(--na-accent)]" : "text-[var(--na-muted)]"
              }`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                view === "list" ? "bg-[var(--na-surface-2)] text-[var(--na-accent)]" : "text-[var(--na-muted)]"
              }`}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <AppointmentFilters
        status={filters.status}
        staffId={filters.staffId}
        serviceTypeId={filters.serviceTypeId}
        from={filters.from}
        to={filters.to}
        search={filters.search}
        onChange={(patch) => setFilters({ ...filters, ...patch })}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            todayOnly
              ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
              : "border-[var(--na-border)] text-[var(--na-text)]"
          }`}
          onClick={() => {
            setTodayOnly(true);
            const { from, to } = localCalendarDayUtcIsoRange(todayLocalYmd());
            setFilters({ from, to });
          }}
        >
          Today
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            !todayOnly
              ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
              : "border-[var(--na-border)] text-[var(--na-text)]"
          }`}
          onClick={() => {
            setTodayOnly(false);
            setFilters({ from: undefined, to: undefined });
          }}
        >
          All dates
        </button>
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() => void fetchList()}
          disabled={loading}
        >
          Refresh
        </button>
        <span className="text-sm text-[var(--na-muted)]">{loading ? "Loading…" : `${total} total`}</span>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      {view === "month" && (
        <AppointmentCalendarView month={month} onMonthChange={setMonth} items={items} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <AppointmentCard key={a.id} a={a} onChanged={() => void fetchList()} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--na-muted)]">
          Showing {items.length} of {total} (skip {skip}, take {take})
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={skip === 0 || loading}
            onClick={() => setPagination(Math.max(0, skip - take), take)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={skip + take >= total || loading}
            onClick={() => setPagination(skip + take, take)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
