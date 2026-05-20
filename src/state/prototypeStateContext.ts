import {createContext} from "react";
import type {
  CustomerOrder,
  InventoryTransaction,
  ReorderRequest,
  Role,
  ShippingOrder,
  StoreInventoryItem,
} from "../types/domain";

type MovementType = "IN" | "OUT";

interface CreateReorderInput {
  storeId: string;
  priority: ReorderRequest["priority"];
  status: ReorderRequest["status"];
  items: Array<{productId: string; requestedQty: number}>;
}

interface CreateShippingInput {
  requestId: string;
  status: ShippingOrder["status"];
}

export interface PrototypeStateContextValue {
  storeInventory: StoreInventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  customerOrders: CustomerOrder[];
  reorderRequests: ReorderRequest[];
  shippingOrders: ShippingOrder[];
  preferredRole: Role;
  selectedStoreId: string;
  recordInventoryMovement: (
    storeId: string,
    productId: string,
    movementType: MovementType,
    quantity: number,
  ) => void;
  createReorderRequest: (input: CreateReorderInput) => string;
  createShippingOrder: (input: CreateShippingInput) => string | null;
  updateShippingStatus: (
    shipmentId: string,
    nextStatus: ShippingOrder["status"],
  ) => string | null;
  receiveShipment: (shipmentId: string) => string | null;
  serveCustomerOrder: (input: {
    storeId: string;
    customerName: string;
    orderRef: string;
    items: Array<{productId: string; quantity: number}>;
  }) => string | null;
  setPreferredRole: (role: Role) => void;
  setSelectedStoreId: (storeId: string) => void;
  resetPrototypeData: () => void;
}

export const PrototypeStateContext = createContext<PrototypeStateContextValue | null>(null);
