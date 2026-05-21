export type Role = "store" | "warehouse" | "stakeholder";

export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type ShippingStatus = "Draft" | "Packed" | "In Transit" | "Delivered";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "OTC" | "Prescription" | "Cold Chain" | "Supplies";
  reorderThreshold: number;
  warehouseStock: number;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  manager: string;
}

export interface StoreInventoryItem {
  storeId: string;
  productId: string;
  onHand: number;
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
}

export interface CustomerOrderItem {
  productId: string;
  quantity: number;
}

export interface CustomerOrder {
  id: string;
  storeId: string;
  customerName: string;
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
