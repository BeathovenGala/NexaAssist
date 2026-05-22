"use client";

import { create } from "zustand";
import { apiGet } from "@/lib/apiEnvelope";
import type { CalendarPayload } from "@/lib/types/scheduling";
import { todayLocalYmd } from "@/lib/localDay";

export type CalendarViewMode = "day" | "week" | "month";

type CalendarState = {
  view: CalendarViewMode;
  anchorDate: string;
  staffId: string | undefined;
  data: CalendarPayload | null;
  loading: boolean;
  error: string | null;
  setView: (v: CalendarViewMode) => void;
  setAnchorDate: (isoDate: string) => void;
  setStaffId: (id: string | undefined) => void;
  fetchRange: () => Promise<void>;
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: "week",
  anchorDate: todayLocalYmd(),
  staffId: undefined,
  data: null,
  loading: false,
  error: null,
  setView: (view) => set({ view }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),
  setStaffId: (staffId) => set({ staffId }),
  fetchRange: async () => {
    const { view, anchorDate, staffId } = get();
    set({ loading: true, error: null });
    try {
      const path =
        view === "day" ? "/calendar/day" : view === "week" ? "/calendar/week" : "/calendar/month";
      const data = await apiGet<CalendarPayload>(path, {
        date: anchorDate,
        staffId,
      });
      set({ data, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load calendar",
      });
    }
  },
}));
