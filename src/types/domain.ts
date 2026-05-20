export type Role = "store" | "warehouse";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "Produce" | "Dry Goods" | "Frozen" | "Packaging";
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
  weeklyOutflow: number;
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
  status: "Pending" | "Approved" | "Fulfilled";
  items: ReorderRequestItem[];
}

export interface ShippingOrder {
  id: string;
  requestId: string;
  storeId: string;
  shipDate: string;
  eta: string;
  status: "Draft" | "Packed" | "In Transit" | "Delivered";
}
