"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

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

function SlotSkeletonGrid() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] animate-pulse rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)]"
        />
      ))}
    </div>
  );
}

export function BookingSinglePage({ onBooked }: { onBooked?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastStore();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayLocalYmd);
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [dayAppointments, setDayAppointments] = useState<AppointmentListItem[]>([]);
  const [dayBlocked, setDayBlocked] = useState<BlockedRow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
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
        if (!cancelled) setServiceTypes(rows);
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
    if (!service || !staffId) {
      setSlots([]);
      setDayAppointments([]);
      setDayBlocked([]);
      setSelectedSlot(null);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    void (async () => {
      try {
        const { from, to } = localCalendarDayUtcIsoRange(selectedDate);
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
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service, staffId, selectedDate]);

  async function ensureStaffLoaded() {
    if (!staffOptions.length) {
      await loadStaff();
    }
    if (!isCustomerOnly && !users.length) {
      await loadUsers();
    }
  }

  useEffect(() => {
    if (!serviceId) return;
    void ensureStaffLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load staff when service chosen
  }, [serviceId]);

  useEffect(() => {
    if (isCustomerOnly && user) {
      setCustomerId(user.id);
    }
  }, [isCustomerOnly, user]);

  async function confirmBooking() {
    if (!selectedSlot || !service || !staffId || !customerId) {
      toast.show("Select service, staff, and a time slot", "error");
      return;
    }
    const stillFree = slots.some(
      (s) => s.startTime === selectedSlot.startTime && s.endTime === selectedSlot.endTime,
    );
    if (!stillFree) {
      toast.show("That slot is no longer available — pick another time", "error");
      return;
    }
    const blockedHit = dayBlocked.some((b) =>
      overlaps(selectedSlot.startTime, selectedSlot.endTime, b.blockedFrom, b.blockedTo),
    );
    if (blockedHit) {
      toast.show("Selected time overlaps blocked hours", "error");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/appointments", {
        customerId,
        assignedStaffId: staffId,
        serviceTypeId: service.id,
        title: (title.trim() || `${service.name} — booking`).slice(0, 200),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
        source: isCustomerOnly ? "PUBLIC_BOOKING" : "DASHBOARD",
        notes: notes.trim() || undefined,
      });
      toast.show("Appointment requested", "info");
      onBooked?.();
      setServiceId(null);
      setStaffId(null);
      setSlots([]);
      setSelectedSlot(null);
      setTitle("");
      setNotes("");
      router.push("/dashboard/appointments");
    } catch (e) {
      toast.show(apiErrorMessage(e, "Booking failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <section className="na-card border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Service
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {serviceTypes.map((s) => {
              const active = serviceId === s.id;
              const dot = s.colorCode ?? "var(--na-accent)";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition ${
                    active
                      ? "border-[var(--na-accent)]/50 bg-[color-mix(in_srgb,var(--na-cyan)_8%,transparent)]"
                      : "border-[var(--na-border)] hover:border-[var(--na-muted)]/40"
                  }`}
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: dot }}
                  />
                  <span>
                    <span className="block font-medium text-[var(--na-text)]">{s.name}</span>
                    <span className="text-xs text-[var(--na-muted)]">{s.durationMinutes} min</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="na-card border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Provider
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {staffOptions.map((u) => {
              const active = staffId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setStaffId(u.id)}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                    active
                      ? "border-[var(--na-accent)]/50 bg-[color-mix(in_srgb,var(--na-cyan)_8%,transparent)]"
                      : "border-[var(--na-border)] hover:border-[var(--na-muted)]/40"
                  }`}
                >
                  <span className="block font-medium text-[var(--na-text)]">
                    {u.firstName} {u.lastName ?? ""}
                  </span>
                  <span className="text-xs text-[var(--na-muted)]">{u.email}</span>
                </button>
              );
            })}
            {!staffOptions.length && (
              <p className="text-xs text-[var(--na-muted)]">Select a service first to load staff.</p>
            )}
          </div>
        </section>

        <section className="na-card border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Date
          </h2>
          <label className="mt-3 block text-xs text-[var(--na-muted)]">
            Day
            <input
              type="date"
              className="na-input mt-1 w-full max-w-xs"
              value={selectedDate}
              min={todayLocalYmd()}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v < todayLocalYmd()) {
                  setSelectedDate(todayLocalYmd());
                  return;
                }
                setSelectedDate(v);
              }}
            />
          </label>
        </section>

        {!isCustomerOnly && (
          <section className="na-card border border-[var(--na-border-subtle)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
              Customer
            </h2>
            <select
              className="na-input mt-3 w-full"
              value={customerId ?? ""}
              onChange={(e) => setCustomerId(e.target.value || null)}
            >
              <option value="">Select customer…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName ?? ""} ({u.email})
                </option>
              ))}
            </select>
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="na-card border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Schedule
          </h2>
          <p className="mt-1 text-xs text-[var(--na-muted)]">
            Available, booked, and blocked times for{" "}
            <span className="font-medium text-[var(--na-text)]">
              {format(new Date(`${selectedDate}T12:00:00`), "EEE MMM d, yyyy")}
            </span>
            .
          </p>
          {slotsLoading ? (
            <div className="mt-4">
              <SlotSkeletonGrid />
            </div>
          ) : (
            <div className="mt-4">
              <SlotPicker
                cards={slotCards}
                selectedStart={selectedSlot?.startTime ?? null}
                onSelectAvailable={setSelectedSlot}
                disabled={loading}
              />
            </div>
          )}
        </section>

        {selectedSlot && service && (
          <section className="na-card border border-[color-mix(in_srgb,var(--na-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--na-cyan)_6%,transparent)] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--na-muted)]">
              Selected
            </h3>
            <p className="mt-2 text-sm text-[var(--na-text)]">
              <span className="font-medium">{service.name}</span>
              {" · "}
              {format(new Date(selectedSlot.startTime), "HH:mm")} –{" "}
              {format(new Date(selectedSlot.endTime), "HH:mm")}
            </p>
          </section>
        )}

        <section className="na-card border border-[var(--na-border-subtle)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Details
          </h2>
          <label className="mt-3 block text-xs text-[var(--na-muted)]">
            Title (optional)
            <input
              className="na-input mt-1 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reason for visit"
            />
          </label>
          <label className="mt-3 block text-xs text-[var(--na-muted)]">
            Notes (optional)
            <textarea
              className="na-input mt-1 min-h-[80px] w-full resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="na-btn-primary mt-6 w-full px-4 py-2.5 text-sm disabled:opacity-50"
            disabled={loading || slotsLoading || !selectedSlot}
            onClick={() => void confirmBooking()}
          >
            {loading ? "Submitting…" : isCustomerOnly ? "Request appointment" : "Book appointment"}
          </button>
        </section>
      </div>
    </div>
  );
}
