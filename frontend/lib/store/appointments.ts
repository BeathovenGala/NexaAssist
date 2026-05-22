"use client";

import { create } from "zustand";
import { apiGet } from "@/lib/apiEnvelope";
import type { AppointmentListItem } from "@/lib/types/scheduling";

export type AppointmentFilters = {
  status?: string;
  staffId?: string;
  serviceTypeId?: string;
  from?: string;
  to?: string;
  search?: string;
};

type ListResponse = {
  items: AppointmentListItem[];
  total: number;
  skip: number;
  take: number;
};

type AppointmentsState = {
  items: AppointmentListItem[];
  total: number;
  skip: number;
  take: number;
  filters: AppointmentFilters;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  setFilters: (f: Partial<AppointmentFilters>) => void;
  setPagination: (skip: number, take: number) => void;
  setSelectedId: (id: string | null) => void;
  fetchList: () => Promise<void>;
};

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  items: [],
  total: 0,
  skip: 0,
  take: 25,
  filters: {},
  loading: false,
  error: null,
  selectedId: null,
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f }, skip: 0 })),
  setPagination: (skip, take) => set({ skip, take }),
  setSelectedId: (selectedId) => set({ selectedId }),
  fetchList: async () => {
    const { skip, take, filters } = get();
    set({ loading: true, error: null });
    try {
      const params: Record<string, string | number | undefined> = {
        skip,
        take,
        status: filters.status,
        staffId: filters.staffId,
        serviceTypeId: filters.serviceTypeId,
        from: filters.from,
        to: filters.to,
        search: filters.search,
      };
      const data = await apiGet<ListResponse>("/appointments", params);
      set({
        items: data.items,
        total: data.total,
        skip: data.skip,
        take: data.take,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load appointments",
      });
    }
  },
}));
