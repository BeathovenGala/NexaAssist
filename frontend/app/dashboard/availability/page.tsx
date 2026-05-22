"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AvailabilitySettings } from "@/components/appointments/AvailabilitySettings";
import { LeaveManager } from "@/components/appointments/LeaveManager";
import { apiGet } from "@/lib/apiEnvelope";

type StaffOption = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  userCode: string;
};

type TabId = "schedule" | "leave";

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("schedule");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiGet<StaffOption[]>("/appointments/bookable-staff");
        if (cancelled) return;
        setStaffList(rows);
        setStaffId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          if (user?.id && rows.some((r) => r.id === user.id)) return user.id;
          return rows[0]?.id ?? "";
        });
      } catch {
        if (!cancelled && user?.id) setStaffId(user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Availability</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
          Set recurring weekly working hours, then manage leave and one-off blocked time. Slots for
          booking are generated from this schedule.
        </p>
      </div>

      <label className="block max-w-md text-xs text-[var(--na-muted)]">
        Staff member
        <select
          className="na-input mt-1 w-full"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        >
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName ?? ""} — {s.email}
            </option>
          ))}
        </select>
      </label>

      {staffId ? (
        <>
          <div className="flex gap-1 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "schedule"
                  ? "bg-[var(--na-surface)] text-[var(--na-text)] shadow-sm"
                  : "text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
              onClick={() => setTab("schedule")}
            >
              Schedule
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "leave"
                  ? "bg-[var(--na-surface)] text-[var(--na-text)] shadow-sm"
                  : "text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
              onClick={() => setTab("leave")}
            >
              Leave & blocks
            </button>
          </div>

          {tab === "schedule" ? (
            <AvailabilitySettings staffId={staffId} />
          ) : (
            <LeaveManager staffId={staffId} />
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--na-muted)]">Loading staff…</p>
      )}
    </div>
  );
}
