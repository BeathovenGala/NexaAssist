"use client";

export function AppointmentFilters({
  status,
  staffId,
  serviceTypeId,
  from,
  to,
  search,
  onChange,
}: {
  status?: string;
  staffId?: string;
  serviceTypeId?: string;
  from?: string;
  to?: string;
  search?: string;
  onChange: (patch: Record<string, string | undefined>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 lg:flex-row lg:flex-wrap lg:items-end">
      <label className="flex min-w-[140px] flex-1 flex-col text-xs text-[var(--na-muted)]">
        Search
        <input
          className="na-input mt-1"
          value={search ?? ""}
          placeholder="Title, code, email…"
          onChange={(e) => onChange({ search: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[120px] flex-col text-xs text-[var(--na-muted)]">
        Status
        <select
          className="na-input mt-1"
          value={status ?? ""}
          onChange={(e) => onChange({ status: e.target.value || undefined })}
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RESCHEDULED">Rescheduled</option>
          <option value="NO_SHOW">No show</option>
        </select>
      </label>
      <label className="flex min-w-[140px] flex-col text-xs text-[var(--na-muted)]">
        From
        <input
          type="date"
          className="na-input mt-1"
          value={from ?? ""}
          onChange={(e) => onChange({ from: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[140px] flex-col text-xs text-[var(--na-muted)]">
        To
        <input
          type="date"
          className="na-input mt-1"
          value={to ?? ""}
          onChange={(e) => onChange({ to: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[160px] flex-1 flex-col text-xs text-[var(--na-muted)]">
        Staff ID
        <input
          className="na-input mt-1 font-mono text-xs"
          value={staffId ?? ""}
          placeholder="UUID filter"
          onChange={(e) => onChange({ staffId: e.target.value || undefined })}
        />
      </label>
      <label className="flex min-w-[160px] flex-1 flex-col text-xs text-[var(--na-muted)]">
        Service type ID
        <input
          className="na-input mt-1 font-mono text-xs"
          value={serviceTypeId ?? ""}
          placeholder="UUID filter"
          onChange={(e) => onChange({ serviceTypeId: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
