"use client";

import { create } from "zustand";
import { apiGet, apiPatch } from "@/lib/apiEnvelope";

export type JoinRequestRow = {
  id: string;
  tenantId: string;
  userId: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; slug: string };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    userCode: string;
  };
};

type State = {
  items: JoinRequestRow[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
  fetchList: (status?: string) => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  approve: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
};

export const useJoinRequestsStore = create<State>((set, get) => ({
  items: [],
  pendingCount: 0,
  loading: false,
  error: null,
  fetchList: async (status = "PENDING") => {
    set({ loading: true, error: null });
    try {
      const rows = await apiGet<JoinRequestRow[]>("/join-requests", { status });
      set({ items: rows, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      });
    }
  },
  fetchPendingCount: async () => {
    try {
      const r = await apiGet<{ count: number }>("/join-requests/pending-count");
      set({ pendingCount: r.count });
    } catch {
      set({ pendingCount: 0 });
    }
  },
  approve: async (id: string) => {
    await apiPatch(`/join-requests/${id}/approve`);
    await get().fetchList();
    await get().fetchPendingCount();
  },
  reject: async (id: string) => {
    await apiPatch(`/join-requests/${id}/reject`);
    await get().fetchList();
    await get().fetchPendingCount();
  },
}));
