"use client";

import { create } from "zustand";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/apiEnvelope";
import type {
  InventoryDashboard,
  InventoryItemListRow,
  InventoryRequestRow,
  Paginated,
  StockMovementRow,
  InventoryAlertRow,
  InventoryCategory,
} from "@/lib/types/inventory";

type InventoryState = {
  dashboard: InventoryDashboard | null;
  dashboardLoading: boolean;
  dashboardError: string | null;
  fetchDashboard: () => Promise<void>;

  items: Paginated<InventoryItemListRow> | null;
  itemsLoading: boolean;
  itemsError: string | null;
  itemFilters: {
    search?: string;
    lowStockOnly?: boolean;
    outOfStockOnly?: boolean;
    categoryId?: string;
  };
  itemSkip: number;
  itemTake: number;
  setItemFilters: (f: Partial<InventoryState["itemFilters"]>) => void;
  setItemPagination: (skip: number, take: number) => void;
  fetchItems: () => Promise<void>;

  movements: Paginated<StockMovementRow> | null;
  movementsLoading: boolean;
  movementsError: string | null;
  movementSkip: number;
  movementTake: number;
  setMovementPagination: (skip: number, take: number) => void;
  fetchMovements: (params?: { itemId?: string }) => Promise<void>;

  requests: Paginated<InventoryRequestRow> | null;
  requestsLoading: boolean;
  requestsError: string | null;
  requestSkip: number;
  requestTake: number;
  requestMineOnly: boolean;
  setRequestPagination: (skip: number, take: number) => void;
  setRequestMineOnly: (v: boolean) => void;
  fetchRequests: () => Promise<void>;

  alerts: Paginated<InventoryAlertRow> | null;
  alertsLoading: boolean;
  alertsError: string | null;
  alertSkip: number;
  alertTake: number;
  setAlertPagination: (skip: number, take: number) => void;
  fetchAlerts: () => Promise<void>;

  categories: InventoryCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  fetchCategories: () => Promise<void>;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  dashboard: null,
  dashboardLoading: false,
  dashboardError: null,
  async fetchDashboard() {
    set({ dashboardLoading: true, dashboardError: null });
    try {
      const data = await apiGet<InventoryDashboard>("/inventory/dashboard");
      set({ dashboard: data, dashboardLoading: false });
    } catch (e) {
      set({
        dashboardLoading: false,
        dashboardError: e instanceof Error ? e.message : "Failed to load dashboard",
      });
    }
  },

  items: null,
  itemsLoading: false,
  itemsError: null,
  itemFilters: {},
  itemSkip: 0,
  itemTake: 25,
  setItemFilters: (f) => set((s) => ({ itemFilters: { ...s.itemFilters, ...f }, itemSkip: 0 })),
  setItemPagination: (skip, take) => set({ itemSkip: skip, itemTake: take }),
  async fetchItems() {
    const { itemSkip, itemTake, itemFilters } = get();
    set({ itemsLoading: true, itemsError: null });
    try {
      const data = await apiGet<Paginated<InventoryItemListRow>>("/inventory/items", {
        skip: itemSkip,
        take: itemTake,
        search: itemFilters.search,
        categoryId: itemFilters.categoryId,
        lowStockOnly: itemFilters.lowStockOnly,
        outOfStockOnly: itemFilters.outOfStockOnly,
      });
      set({ items: data, itemsLoading: false });
    } catch (e) {
      set({
        itemsLoading: false,
        itemsError: e instanceof Error ? e.message : "Failed to load items",
      });
    }
  },

  movements: null,
  movementsLoading: false,
  movementsError: null,
  movementSkip: 0,
  movementTake: 40,
  setMovementPagination: (skip, take) => set({ movementSkip: skip, movementTake: take }),
  async fetchMovements(params) {
    const { movementSkip, movementTake } = get();
    set({ movementsLoading: true, movementsError: null });
    try {
      const data = await apiGet<Paginated<StockMovementRow>>("/inventory/movements", {
        skip: movementSkip,
        take: movementTake,
        itemId: params?.itemId,
      });
      set({ movements: data, movementsLoading: false });
    } catch (e) {
      set({
        movementsLoading: false,
        movementsError: e instanceof Error ? e.message : "Failed to load movements",
      });
    }
  },

  requests: null,
  requestsLoading: false,
  requestsError: null,
  requestSkip: 0,
  requestTake: 25,
  requestMineOnly: false,
  setRequestPagination: (skip, take) => set({ requestSkip: skip, requestTake: take }),
  setRequestMineOnly: (v) => set({ requestMineOnly: v, requestSkip: 0 }),
  async fetchRequests(params?: { itemId?: string }) {
    const { requestSkip, requestTake, requestMineOnly } = get();
    set({ requestsLoading: true, requestsError: null });
    try {
      const data = await apiGet<Paginated<InventoryRequestRow>>("/inventory/requests", {
        skip: requestSkip,
        take: requestTake,
        mineOnly: requestMineOnly || undefined,
        itemId: params?.itemId,
      });
      set({ requests: data, requestsLoading: false });
    } catch (e) {
      set({
        requestsLoading: false,
        requestsError: e instanceof Error ? e.message : "Failed to load requests",
      });
    }
  },

  alerts: null,
  alertsLoading: false,
  alertsError: null,
  alertSkip: 0,
  alertTake: 30,
  setAlertPagination: (skip, take) => set({ alertSkip: skip, alertTake: take }),
  async fetchAlerts() {
    const { alertSkip, alertTake } = get();
    set({ alertsLoading: true, alertsError: null });
    try {
      const data = await apiGet<Paginated<InventoryAlertRow>>("/inventory/alerts", {
        skip: alertSkip,
        take: alertTake,
      });
      set({ alerts: data, alertsLoading: false });
    } catch (e) {
      set({
        alertsLoading: false,
        alertsError: e instanceof Error ? e.message : "Failed to load alerts",
      });
    }
  },

  categories: [],
  categoriesLoading: false,
  categoriesError: null,
  async fetchCategories() {
    set({ categoriesLoading: true, categoriesError: null });
    try {
      const data = await apiGet<InventoryCategory[]>("/inventory/categories");
      set({ categories: data, categoriesLoading: false });
    } catch (e) {
      set({
        categoriesLoading: false,
        categoriesError: e instanceof Error ? e.message : "Failed to load categories",
      });
    }
  },
}));

export async function postMovementIn(body: {
  itemId: string;
  quantity: number;
  reason?: string;
}): Promise<void> {
  await apiPost("/inventory/movements/in", body);
}

export async function postMovementOut(body: {
  itemId: string;
  quantity: number;
  reason?: string;
}): Promise<void> {
  await apiPost("/inventory/movements/out", body);
}

export async function postMovementAdjust(body: {
  itemId: string;
  newQuantity: number;
  reason?: string;
}): Promise<void> {
  await apiPost("/inventory/movements/adjust", body);
}

export async function createRestockRequest(body: {
  itemId: string;
  quantityRequested: number;
  reason?: string;
}): Promise<void> {
  await apiPost("/inventory/requests", body);
}

export async function approveRequest(
  id: string,
  body?: { approvedQuantity?: number; managerNotes?: string },
): Promise<void> {
  await apiPatch(`/inventory/requests/${id}/approve`, body ?? {});
}

export async function rejectRequest(id: string, body?: { managerNotes?: string }): Promise<void> {
  await apiPatch(`/inventory/requests/${id}/reject`, body ?? {});
}

export async function fulfillRequest(
  id: string,
  body: { quantity: number; reason?: string },
): Promise<void> {
  await apiPatch(`/inventory/requests/${id}/fulfill`, body);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await apiPatch(`/inventory/alerts/${id}/acknowledge`);
}

export async function resolveAlert(id: string): Promise<void> {
  await apiPatch(`/inventory/alerts/${id}/resolve`);
}

export async function markAlertRead(id: string): Promise<void> {
  await apiPatch(`/inventory/alerts/${id}/read`);
}

export async function createCategory(body: { name: string; description?: string }): Promise<void> {
  await apiPost("/inventory/categories", body);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiDelete(`/inventory/categories/${id}`);
}

export async function updateCategory(
  id: string,
  body: { name?: string; description?: string },
): Promise<void> {
  await apiPatch(`/inventory/categories/${id}`, body);
}

export async function createInventoryItem(body: Record<string, unknown>): Promise<unknown> {
  return apiPost("/inventory/items", body);
}
