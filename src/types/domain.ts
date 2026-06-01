export type Role = "store" | "warehouse" | "stakeholder";

export type MovementType = "IN" | "OUT" | "ADJUSTMENT";
export type ExpiryStatus = "Healthy" | "Near Expiry" | "Expired";

export type ShippingStatus = "Draft" | "Packed" | "In Transit" | "Delivered";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "OTC" | "Prescription" | "Cold Chain" | "Supplies";
  reorderThreshold: number;
  warehouseStock: number;
  expiryWarningDays: number;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  manager: string;
}

export interface InventoryBatch {
  batchId: string;
  quantity: number;
  expiryDate: string;
}

export interface StoreInventoryItem {
  storeId: string;
  productId: string;
  batches: InventoryBatch[];
  onHand: number;
  expiredUnits: number;
  nearExpiryUnits: number;
  nextExpiryDate: string;
}

export interface InventoryTransaction {
  id: string;
  storeId: string;
  productId: string;
  movementType: MovementType;
  quantity: number;
  occurredAt: string;
  reference: string;
  note: string;
  batchId?: string;
  expiryDate?: string;
  expiryStatus?: ExpiryStatus;
}

export interface CustomerOrderItem {
  productId: string;
  quantity: number;
  batchId?: string;
  expiryDate?: string;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  preferredStoreId: string;
  lastOrderRef: string;
  lastServedAt: string;
}

export interface CustomerOrder {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerNotes: string;
  orderRef: string;
  items: CustomerOrderItem[];
  servedAt: string;
}

export interface ReorderRequestItem {
  productId: string;
  requestedQty: number;
}

export interface ReorderRequest {
  id: string;
  storeId: string;
  createdAt: string;
  priority: "Low" | "Medium" | "High";
  status: "Draft" | "Pending" | "Approved" | "Fulfilled";
  items: ReorderRequestItem[];
}

export interface ShippingOrderItem {
  productId: string;
  quantity: number;
  batchId: string;
  expiryDate: string;
}

export interface ShippingStatusEvent {
  status: ShippingStatus;
  occurredAt: string;
  location: string;
  note: string;
}

export interface ShippingOrder {
  id: string;
  requestId: string;
  storeId: string;
  shipDate: string;
  eta: string;
  status: ShippingStatus;
  items: ShippingOrderItem[];
  carrier: string;
  trackingCode: string;
  currentLocation: string;
  statusHistory: ShippingStatusEvent[];
}
