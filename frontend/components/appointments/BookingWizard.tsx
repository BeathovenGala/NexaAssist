"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type {
  AppointmentListItem,
  FreeSlot,
  ServiceType,
  SlotPickerCard,
} from "@/lib/types/scheduling";
import { useToastStore } from "@/lib/store/toast";
import { SlotPicker } from "./SlotPicker";
import { useAuth } from "@/lib/auth";
import { localCalendarDayUtcIsoRange, todayLocalYmd } from "@/lib/localDay";

type StaffOption = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  userCode: string;
  roles: string[];
};

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  roles: string[];
};

type BlockedRow = {
  id: string;
  blockedFrom: string;
  blockedTo: string;
  reason: string | null;
};

type AppointmentsListResponse = {
  items: AppointmentListItem[];
  total: number;
};

function slotCardsForDay(
  free: FreeSlot[],
  appointments: AppointmentListItem[],
  blocked: BlockedRow[],
  staffId: string,
): SlotPickerCard[] {
  const cards: SlotPickerCard[] = [];
  for (const s of free) {
    cards.push({ kind: "available", startTime: s.startTime, endTime: s.endTime });
  }
  for (const a of appointments) {
    if (a.assignedStaff.id !== staffId) continue;
    if (a.status !== "PENDING" && a.status !== "CONFIRMED") continue;
    cards.push({
      kind: "booked",
      startTime: a.startTime,
      endTime: a.endTime,
      title: a.title,
    });
  }
  for (const b of blocked) {
    cards.push({
      kind: "blocked",
      startTime: b.blockedFrom,
      endTime: b.blockedTo,
      reason: b.reason,
    });
  }
  return cards;
}

const STEP_LABELS = ["Service", "People", "Time"];

export function BookingWizard({ onBooked }: { onBooked?: () => void }) {
  const { user } = useAuth();
  const toast = useToastStore();
  const [step, setStep] = useState(0);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [date, setDate] = useState(todayLocalYmd);
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [dayAppointments, setDayAppointments] = useState<AppointmentListItem[]>([]);
  const [dayBlocked, setDayBlocked] = useState<BlockedRow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const service = useMemo(
    () => serviceTypes.find((s) => s.id === serviceId) ?? null,
    [serviceTypes, serviceId],
  );

  const isCustomerOnly =
    user && user.roles.length > 0 && user.roles.every((r) => r === "CUSTOMER");

  const slotCards = useMemo(() => {
    if (!staffId) return [];
    return slotCardsForDay(slots, dayAppointments, dayBlocked, staffId);
  }, [slots, dayAppointments, dayBlocked, staffId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiGet<ServiceType[]>("/service-types", { activeOnly: true });
        if (!cancelled) {
          setServiceTypes(rows);
        }
      } catch {
        if (!cancelled) {
          useToastStore.getState().show("Could not load services", "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStaff = useCallback(async () => {
    const rows = await apiGet<StaffOption[]>("/appointments/bookable-staff");
    setStaffOptions(rows);
  }, []);

  const loadUsers = useCallback(async () => {
    const rows = await apiGet<PublicUser[]>("/users");
    setUsers(rows);
  }, []);

  useEffect(() => {
    if (step !== 2 || !service || !staffId) {
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    void (async () => {
      try {
        const { from, to } = localCalendarDayUtcIsoRange(date);
        const [free, apptRes, blockedRows] = await Promise.all([
          apiGet<FreeSlot[]>("/availability/free-slots", {
            staffId,
            from,
            to,
            durationMinutes: service.durationMinutes,
          }),
          apiGet<AppointmentsListResponse>("/appointments", {
            staffId,
            from,
            to,
            take: 100,
            skip: 0,
          }),
          apiGet<BlockedRow[]>("/availability/blocked", {
            staffId,
            from,
            to,
          }),
        ]);
        if (!cancelled) {
          setSlots(free);
          setDayAppointments(apptRes.items ?? []);
          setDayBlocked(blockedRows);
          setSelectedSlot(null);
        }
      } catch (e) {
        if (!cancelled) {
          useToastStore.getState().show(apiErrorMessage(e, "Could not load slots"), "error");
          setSlots([]);
          setDayAppointments([]);
          setDayBlocked([]);
          setSelectedSlot(null);
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, date, service, staffId]);

  async function goNext() {
    try {
      if (step === 0) {
        if (!serviceId) {
          toast.show("Select a service", "error");
          return;
        }
        setLoading(true);
        await loadStaff();
        if (!isCustomerOnly) {
          await loadUsers();
        }
        setLoading(false);
        setStep(1);
        return;
      }
      if (step === 1) {
        if (!staffId) {
          toast.show("Select staff", "error");
          return;
        }
        if (isCustomerOnly && user) {
          setCustomerId(user.id);
        } else if (!customerId) {
          toast.show("Select customer", "error");
          return;
        }
        setStep(2);
        return;
      }
    } catch (e) {
      setLoading(false);
      toast.show(apiErrorMessage(e, "Booking failed"), "error");
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || !service || !staffId || !customerId) {
      toast.show("Select a time slot", "error");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/appointments", {
        customerId,
        assignedStaffId: staffId,
        serviceTypeId: service.id,
        title: `${service.name} — ${date}`,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
        source: isCustomerOnly ? "PUBLIC_BOOKING" : "DASHBOARD",
      });
      toast.show("Appointment booked", "info");
      onBooked?.();
      setStep(0);
      setServiceId(null);
      setStaffId(null);
      setCustomerId(null);
      setSlots([]);
      setSelectedSlot(null);
      setDate(todayLocalYmd());
    } catch (e) {
      toast.show(apiErrorMessage(e, "Booking failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (step === 2) {
      setSlots([]);
      setSelectedSlot(null);
    }
    setStep((s) => Math.max(0, s - 1));
  }

  const staffCandidates = staffOptions;
  return (
    <div className="na-card border border-[var(--na-border-subtle)] p-6">
      <div className="mb-6 flex flex-wrap gap-2 text-xs text-[var(--na-muted)]">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-2 py-1 ${
              i === step
                ? "bg-[var(--na-surface-2)] text-[var(--na-accent)] ring-1 ring-[var(--na-accent)]/25"
                : ""
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <label className="block text-sm text-[var(--na-muted)]">Service</label>
          <select
            className="na-input"
            value={serviceId ?? ""}
            onChange={(e) => setServiceId(e.target.value || null)}
          >
            <option value="">Select…</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
          <p className="text-sm text-[var(--na-muted)]">
            Times shown in your device timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}
            ).
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-[var(--na-muted)]">Staff</label>
            <select
              className="na-input mt-1"
              value={staffId ?? ""}
              onChange={(e) => setStaffId(e.target.value || null)}
            >
              <option value="">Select…</option>
              {staffCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName ?? ""} ({u.email})
                </option>
              ))}
            </select>
          </div>
          {!isCustomerOnly && (
            <div>
              <label className="block text-sm text-[var(--na-muted)]">Customer</label>
              <select
                className="na-input mt-1"
                value={customerId ?? ""}
                onChange={(e) => setCustomerId(e.target.value || null)}
              >
                <option value="">Select…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName ?? ""} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--na-muted)]">Date</label>
            <input
              type="date"
              className="na-input mt-1 max-w-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {slotsLoading ? (
            <p className="text-sm text-[var(--na-muted)]">Loading available times…</p>
          ) : (
            <>
              <p className="text-sm text-[var(--na-muted)]">
                Available slots respect availability, blocks, and existing bookings.
              </p>
              <SlotPicker
                cards={slotCards}
                selectedStart={selectedSlot?.startTime ?? null}
                onSelectAvailable={setSelectedSlot}
                disabled={loading}
              />
            </>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        {step > 0 && (
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
            onClick={goBack}
            disabled={loading || slotsLoading}
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            type="button"
            className="na-btn-primary px-4 py-2"
            onClick={() => void goNext()}
            disabled={loading}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="na-btn-primary px-4 py-2 disabled:opacity-50"
            onClick={() => void confirmBooking()}
            disabled={loading || slotsLoading || !selectedSlot}
          >
            {loading ? "Booking…" : "Confirm booking"}
          </button>
        )}
      </div>
    </div>
  );
}
