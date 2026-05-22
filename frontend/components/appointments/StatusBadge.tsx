"use client";

import type { AppointmentStatus } from "@/lib/types/scheduling";

const STYLES: Record<AppointmentStatus, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/15",
  CONFIRMED:
    "border-[color-mix(in_srgb,var(--na-cyan)_35%,transparent)] bg-[color-mix(in_srgb,var(--na-cyan)_12%,transparent)] text-[var(--na-text)] ring-1 ring-[color-mix(in_srgb,var(--na-cyan)_22%,transparent)]",
  REJECTED: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
  CANCELLED: "border-red-500/25 bg-red-500/10 text-red-100",
  RESCHEDULED:
    "border-[color-mix(in_srgb,var(--na-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--na-accent)_10%,transparent)] text-[var(--na-text)]",
  NO_SHOW: "border-red-500/25 bg-red-950/30 text-red-100",
};

const CUSTOMER_LABELS: Partial<Record<AppointmentStatus, string>> = {
  PENDING: "Request sent",
  CONFIRMED: "Booking confirmed",
  REJECTED: "Declined by provider",
};

export function StatusBadge({
  status,
  customerView,
}: {
  status: AppointmentStatus;
  customerView?: boolean;
}) {
  const label =
    customerView && CUSTOMER_LABELS[status]
      ? CUSTOMER_LABELS[status]
      : status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
