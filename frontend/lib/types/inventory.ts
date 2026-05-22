/** Mirrors backend inventory API shapes (ISO date strings). */

export type InventoryCategory = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemStatus =
  | "ACTIVE"
  | "LOW"
  | "OUT_OF_STOCK"
  | "ARCHIVED"
  | "EXPIRED"
  | "DAMAGED"
  | "RESTRICTED";

export type InventoryItemListRow = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  name: string;
  sku: string;
  description: string | null;
  unit: string;
  barcode: string | null;
  locationId: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumThreshold: number;
  maximumThreshold: number | null;
  status: InventoryItemStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MovementType =
  | "IN"
  | "OUT"
  | "ADJUSTMENT"
  | "RETURN"
  | "TRANSFER"
  | "APPROVED_REQUEST"
  | "DAMAGED"
  | "EXPIRED";

export type StockMovementRow = {
  id: string;
  tenantId: string;
  itemId: string;
  item: { id: string; name: string; sku: string };
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  locationId: string | null;
  performedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    userCode: string;
  };
  createdAt: string;
};

export type InventoryRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";

export type RequestPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type InventoryRequestRow = {
  id: string;
  tenantId: string;
  itemId: string;
  item: { id: string; name: string; sku: string; quantity: number };
  requestedById: string;
  requestedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    userCode: string;
  };
  quantityRequested: number;
  approvedQuantity: number | null;
  fulfilledQuantity: number;
  priority: RequestPriority;
  reason: string | null;
  status: InventoryRequestStatus;
  managerNotes: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    userCode: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "OVERSTOCK"
  | "DAMAGED"
  | "EXPIRING"
  | "HIGH_USAGE";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export type InventoryAlertRow = {
  id: string;
  tenantId: string;
  itemId: string;
  item: { id: string; name: string; sku: string; quantity: number };
  type: InventoryAlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryDashboard = {
  metrics: {
    totalItems: number;
    lowStockCount: number;
    criticalAlerts: number;
    pendingRequests: number;
    movementsToday: number;
  };
  inventoryHealth: Partial<Record<InventoryItemStatus, number>>;
  recentMovements: Array<{
    id: string;
    movementType: MovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    item: { id: string; name: string; sku: string };
    performedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
    };
    createdAt: string;
  }>;
  activeAlerts: Array<{
    id: string;
    type: InventoryAlertType;
    severity: AlertSeverity;
    message: string;
    item: { id: string; name: string; sku: string; quantity: number };
    createdAt: string;
  }>;
  pendingRequestItems: Array<{
    id: string;
    quantityRequested: number;
    priority: RequestPriority;
    reason: string | null;
    item: { id: string; name: string; sku: string };
    requestedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
    };
    createdAt: string;
  }>;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};
