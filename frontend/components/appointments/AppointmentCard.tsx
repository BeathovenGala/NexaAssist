"use client";

import { format } from "date-fns";
import Link from "next/link";
import { apiPatch, apiErrorMessage } from "@/lib/apiEnvelope";
import type { AppointmentListItem, AppointmentStatus } from "@/lib/types/scheduling";
import { StatusBadge } from "./StatusBadge";
import { hasPermission, useAuth, isCustomerOnly } from "@/lib/auth";
import { useToastStore } from "@/lib/store/toast";

const statusTone: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  CONFIRMED: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  REJECTED: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  COMPLETED: "bg-zinc-500/15 text-zinc-200 ring-zinc-500/30",
  CANCELLED: "bg-red-500/15 text-red-200 ring-red-500/30",
  RESCHEDULED: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  NO_SHOW: "bg-orange-500/15 text-orange-200 ring-orange-500/30",
};

export function AppointmentCard({
  a,
  onChanged,
}: {
  a: AppointmentListItem;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const toast = useToastStore();
  const canUpdate = hasPermission(user, "appointments:update");
  const canCancel = hasPermission(user, "appointments:cancel");
  const isStaffSelf = user?.id === a.assignedStaff.id;
  const isCustomerSelf = user?.id === a.customer.id;
  const showAccept =
    a.status === "PENDING" && canUpdate && user && !isCustomerOnly(user);
  const showDecline = showAccept;
  const showCancel =
    canCancel &&
    (a.status === "PENDING" || a.status === "CONFIRMED") &&
    (isCustomerSelf || isStaffSelf || (user && !isCustomerOnly(user) && canUpdate));

  async function accept() {
    try {
      await apiPatch(`/appointments/${a.id}/confirm`, {});
      toast.show("Appointment accepted", "info");
      onChanged();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Could not accept"), "error");
    }
  }

  async function decline() {
    try {
      await apiPatch(`/appointments/${a.id}/reject`, {});
      toast.show("Appointment declined", "info");
      onChanged();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Could not decline"), "error");
    }
  }

  async function cancel() {
    try {
      await apiPatch(`/appointments/${a.id}/cancel`, {});
      toast.show("Cancelled", "info");
      onChanged();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Could not cancel"), "error");
    }
  }

  const tone = statusTone[a.status] ?? statusTone.PENDING;

  return (
    <div
      className={`rounded-xl border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 ring-1 ring-inset ${tone}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] text-[var(--na-muted)]">{a.appointmentCode}</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--na-text)]">{a.title}</h3>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            {format(new Date(a.startTime), "EEE MMM d, HH:mm")} – {format(new Date(a.endTime), "HH:mm")}
          </p>
        </div>
        <StatusBadge
          status={a.status}
          customerView={Boolean(user && isCustomerOnly(user))}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--na-muted)]">
        <span className="rounded-md bg-[var(--na-bg-deep)] px-2 py-1">
          {a.assignedStaff.firstName} {a.assignedStaff.lastName ?? ""}
        </span>
        <span className="rounded-md bg-[var(--na-bg-deep)] px-2 py-1">
          {a.customer.firstName} {a.customer.lastName ?? ""}
        </span>
        {a.serviceType && (
          <span
            className="rounded-md px-2 py-1 font-medium text-[var(--na-text)]"
            style={{
              backgroundColor: a.serviceType.colorCode
                ? `${a.serviceType.colorCode}22`
                : "var(--na-surface-2)",
            }}
          >
            {a.serviceType.name}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/appointments/${a.id}`}
          className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
        >
          Details
        </Link>
        {showAccept && (
          <button
            type="button"
            className="rounded-md bg-emerald-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
            onClick={() => void accept()}
          >
            Accept
          </button>
        )}
        {showDecline && (
          <button
            type="button"
            className="rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-950/50"
            onClick={() => void decline()}
          >
            Decline
          </button>
        )}
        {showCancel && (
          <button
            type="button"
            className="rounded-md border border-red-500/40 px-3 py-1 text-xs text-red-200 hover:bg-red-950/50"
            onClick={() => void cancel()}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
