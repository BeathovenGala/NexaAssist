"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch, apiErrorMessage } from "@/lib/apiEnvelope";
import type { AppointmentDetail } from "@/lib/types/scheduling";
import { HistoryTimeline } from "@/components/appointments/HistoryTimeline";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { format } from "date-fns";
import { useToastStore } from "@/lib/store/toast";

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const toast = useToastStore();
  const [row, setRow] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [rsStart, setRsStart] = useState("");
  const [rsEnd, setRsEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<AppointmentDetail>(`/appointments/${id}`);
        if (!cancelled) {
          setRow(data);
        }
      } catch (e) {
        if (!cancelled) {
          toast.show(apiErrorMessage(e, "Failed to load appointment"), "error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function cancel() {
    if (!row) return;
    try {
      await apiPatch(`/appointments/${row.id}/cancel`, { cancellationReason: reason || undefined });
      toast.show("Appointment cancelled", "info");
      router.refresh();
      const data = await apiGet<AppointmentDetail>(`/appointments/${id}`);
      setRow(data);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Cancel failed"), "error");
    }
  }

  async function complete() {
    if (!row) return;
    try {
      await apiPatch(`/appointments/${row.id}/complete`, {});
      toast.show("Marked complete", "info");
      const data = await apiGet<AppointmentDetail>(`/appointments/${id}`);
      setRow(data);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Complete failed"), "error");
    }
  }

  async function reschedule() {
    if (!row || !rsStart || !rsEnd) {
      toast.show("Enter new start and end", "error");
      return;
    }
    try {
      const created = await apiPatch<{ id: string }>(`/appointments/${row.id}/reschedule`, {
        startTime: new Date(rsStart).toISOString(),
        endTime: new Date(rsEnd).toISOString(),
      });
      toast.show("Rescheduled — opening new appointment", "info");
      router.push(`/dashboard/appointments/${created.id}`);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Reschedule failed"), "error");
    }
  }

  if (loading || !row) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/appointments"
            className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
          >
            ← Back to list
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            {row.title}
          </h1>
          <p className="mt-2 font-mono text-xs text-[var(--na-muted)]">{row.appointmentCode}</p>
          <div className="mt-3">
            <StatusBadge status={row.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
            onClick={() => void complete()}
            disabled={row.status === "COMPLETED" || row.status === "CANCELLED"}
          >
            Complete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="na-card space-y-3 border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold text-[var(--na-text)]">Summary</h2>
          <p className="text-sm text-[var(--na-muted)]">
            {format(new Date(row.startTime), "PPpp")} – {format(new Date(row.endTime), "pp")}
          </p>
          <p className="text-sm text-[var(--na-muted)]">Timezone: {row.timezone}</p>
          <p className="text-sm text-[var(--na-muted)]">
            Staff: {row.assignedStaff.firstName} {row.assignedStaff.lastName ?? ""} (
            {row.assignedStaff.email})
          </p>
          <p className="text-sm text-[var(--na-muted)]">
            Customer: {row.customer.firstName} {row.customer.lastName ?? ""} ({row.customer.email})
          </p>
          {row.serviceType && (
            <p className="text-sm text-[var(--na-muted)]">
              Service: {row.serviceType.name} ({row.serviceType.durationMinutes} min)
            </p>
          )}
          {row.notes && (
            <p className="rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-3 text-sm text-[var(--na-text)]">
              {row.notes}
            </p>
          )}
        </div>

        <div className="na-card space-y-3 border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold text-[var(--na-text)]">Cancel</h2>
          <textarea
            className="na-input min-h-[80px]"
            placeholder="Optional reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100 hover:bg-red-950/50"
            onClick={() => void cancel()}
            disabled={row.status === "CANCELLED" || row.status === "COMPLETED"}
          >
            Cancel appointment
          </button>
        </div>
      </div>

      <div className="na-card space-y-3 border border-[var(--na-border-subtle)] p-5">
        <h2 className="text-sm font-semibold text-[var(--na-text)]">Reschedule</h2>
        <p className="text-xs text-[var(--na-muted)]">
          Creates a new pending appointment and marks this one as rescheduled.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--na-muted)]">
            New start (local)
            <input
              type="datetime-local"
              className="na-input mt-1"
              value={rsStart}
              onChange={(e) => setRsStart(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--na-muted)]">
            New end (local)
            <input
              type="datetime-local"
              className="na-input mt-1"
              value={rsEnd}
              onChange={(e) => setRsEnd(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-3 py-2 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() => void reschedule()}
          disabled={row.status === "CANCELLED" || row.status === "COMPLETED"}
        >
          Reschedule
        </button>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
          History
        </h2>
        <HistoryTimeline entries={row.history} />
      </div>
    </div>
  );
}
