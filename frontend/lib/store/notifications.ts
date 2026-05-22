import { create } from "zustand";
import { apiGet, apiPatch } from "@/lib/apiEnvelope";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  actionUrl: string | null;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
};

type NotificationsState = {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  filterStatus?: string;
  filterType?: string;
  fetchList: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setFilters: (f: { status?: string; type?: string }) => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  total: 0,
  unreadCount: 0,
  loading: false,
  error: null,
  filterStatus: undefined,
  filterType: undefined,

  setFilters: (f) => set({ filterStatus: f.status, filterType: f.type }),

  fetchList: async () => {
    set({ loading: true, error: null });
    try {
      const { filterStatus, filterType } = get();
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);
      params.set("take", "50");
      const q = params.toString();
      const data = await apiGet<{
        items: NotificationItem[];
        total: number;
        unreadCount: number;
      }>(`/notifications${q ? `?${q}` : ""}`);
      set({
        items: data.items,
        total: data.total,
        unreadCount: data.unreadCount,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load notifications",
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await apiGet<{ count: number }>("/notifications/unread-count");
      set({ unreadCount: data.count });
    } catch {
      /* ignore polling errors */
    }
  },

  markRead: async (id: string) => {
    await apiPatch(`/notifications/${id}/read`, {});
    await get().fetchList();
    await get().fetchUnreadCount();
  },

  markAllRead: async () => {
    await apiPatch("/notifications/read-all", {});
    await get().fetchList();
    await get().fetchUnreadCount();
  },
}));
