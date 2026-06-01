import {useEffect, useMemo, useState, type PropsWithChildren} from "react";
import {
  customerProfiles as initialCustomerProfiles,
  customerOrders as initialCustomerOrders,
  inventoryTransactions as initialInventoryTransactions,
  products,
  reorderRequests as initialReorderRequests,
  shippingOrders as initialShippingOrders,
  stores,
  storeInventory as initialStoreInventory,
} from "../mocks/mockData";
import type {
  CustomerProfile,
  CustomerOrder,
  ExpiryStatus,
  InventoryBatch,
  InventoryTransaction,
  ReorderRequest,
  Role,
  ShippingStatus,
  ShippingStatusEvent,
  ShippingOrder,
  ShippingOrderItem,
  StoreInventoryItem,
} from "../types/domain";
import {
  PrototypeStateContext,
  type PrototypeStateContextValue,
} from "./prototypeStateContext";

const STORAGE_KEY = "inventory-shipping-prototype-state-v1";

interface PrototypeStateData {
  storeInventory: StoreInventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  customerOrders: CustomerOrder[];
  customerProfiles: CustomerProfile[];
  reorderRequests: ReorderRequest[];
  shippingOrders: ShippingOrder[];
  preferredRole: Role;
  selectedStoreId: string;
}

interface BatchAllocation {
  productId: string;
  batchId: string;
  expiryDate: string;
  quantity: number;
  expiryStatus: ExpiryStatus;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getProductWarningDays(productId: string): number {
  return products.find(product => product.id === productId)?.expiryWarningDays ?? 30;
}

function parseExpiryDateToMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function normalizeBatches(value: unknown): InventoryBatch[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null;
      const typedEntry = entry as {
        batchId?: unknown;
        quantity?: unknown;
        expiryDate?: unknown;
      };

      const batchId = typeof typedEntry.batchId === "string" ? typedEntry.batchId : "";
      const quantity =
        typeof typedEntry.quantity === "number" && typedEntry.quantity > 0
          ? Math.floor(typedEntry.quantity)
          : 0;
      const expiryDate =
        typeof typedEntry.expiryDate === "string" ? typedEntry.expiryDate : "";

      if (!batchId || !quantity || !expiryDate) return null;
      return {batchId, quantity, expiryDate};
    })
    .filter(Boolean) as InventoryBatch[];
}

function fallbackBatchesFromSummary(
  storeId: string,
  productId: string,
  onHand: number,
  expiredUnits: number,
  nearExpiryUnits: number,
  nextExpiryDate: string,
): InventoryBatch[] {
  const healthyUnits = Math.max(0, onHand - expiredUnits - nearExpiryUnits);
  const fallback: InventoryBatch[] = [];

  if (expiredUnits > 0) {
    fallback.push({
      batchId: `${storeId}-${productId}-fallback-expired`,
      quantity: expiredUnits,
      expiryDate: "2026-05-15",
    });
  }

  if (nearExpiryUnits > 0) {
    fallback.push({
      batchId: `${storeId}-${productId}-fallback-near`,
      quantity: nearExpiryUnits,
      expiryDate: nextExpiryDate || "2026-06-15",
    });
  }

  if (healthyUnits > 0) {
    fallback.push({
      batchId: `${storeId}-${productId}-fallback-healthy`,
      quantity: healthyUnits,
      expiryDate: "2026-10-15",
    });
  }

  return fallback;
}

function deriveInventoryFromBatches(
  batches: InventoryBatch[],
  warningDays: number,
): Pick<
  StoreInventoryItem,
  "onHand" | "expiredUnits" | "nearExpiryUnits" | "nextExpiryDate"
> {
  const now = Date.now();
  const activeBatches = batches.filter(batch => batch.quantity > 0);
  const onHand = activeBatches.reduce((acc, batch) => acc + batch.quantity, 0);

  const expiredUnits = activeBatches
    .filter(batch => parseExpiryDateToMs(batch.expiryDate) < now)
    .reduce((acc, batch) => acc + batch.quantity, 0);

  const nearExpiryUnits = activeBatches
    .filter(batch => {
      const expiryMs = parseExpiryDateToMs(batch.expiryDate);
      if (expiryMs < now) return false;
      const daysToExpiry = Math.floor((expiryMs - now) / DAY_IN_MS);
      return daysToExpiry <= warningDays;
    })
    .reduce((acc, batch) => acc + batch.quantity, 0);

  const nextExpiryDate = [...activeBatches].sort(
    (a, b) => parseExpiryDateToMs(a.expiryDate) - parseExpiryDateToMs(b.expiryDate),
  )[0]?.expiryDate;

  return {
    onHand,
    expiredUnits,
    nearExpiryUnits,
    nextExpiryDate: nextExpiryDate ?? "",
  };
}

function getUsableStock(item: StoreInventoryItem): number {
  const now = Date.now();
  return item.batches
    .filter(batch => batch.quantity > 0 && parseExpiryDateToMs(batch.expiryDate) >= now)
    .reduce((acc, batch) => acc + batch.quantity, 0);
}

function allocateFefoBatches(
  inventoryItem: StoreInventoryItem,
  requestedQty: number,
): BatchAllocation[] | null {
  const now = Date.now();
  const warningDays = getProductWarningDays(inventoryItem.productId);
  let remaining = requestedQty;

  const candidateBatches = [...inventoryItem.batches]
    .filter(batch => batch.quantity > 0)
    .sort((a, b) => parseExpiryDateToMs(a.expiryDate) - parseExpiryDateToMs(b.expiryDate));

  const allocations: BatchAllocation[] = [];

  for (const batch of candidateBatches) {
    const expiryMs = parseExpiryDateToMs(batch.expiryDate);
    if (expiryMs < now) continue;
    if (remaining <= 0) break;

    const taken = Math.min(remaining, batch.quantity);
    const daysToExpiry = Math.floor((expiryMs - now) / DAY_IN_MS);
    allocations.push({
      productId: inventoryItem.productId,
      batchId: batch.batchId,
      expiryDate: batch.expiryDate,
      quantity: taken,
      expiryStatus: daysToExpiry <= warningDays ? "Near Expiry" : "Healthy",
    });
    remaining -= taken;
  }

  if (remaining > 0) return null;
  return allocations;
}

function normalizeStoreInventory(value: unknown): StoreInventoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null;

      const typedEntry = entry as {
        storeId?: unknown;
        productId?: unknown;
        batches?: unknown;
        onHand?: unknown;
        expiredUnits?: unknown;
        nearExpiryUnits?: unknown;
        nextExpiryDate?: unknown;
      };

      const storeId = typeof typedEntry.storeId === "string" ? typedEntry.storeId : "";
      const productId =
        typeof typedEntry.productId === "string" ? typedEntry.productId : "";
      const onHand =
        typeof typedEntry.onHand === "number" && typedEntry.onHand >= 0
          ? Math.floor(typedEntry.onHand)
          : 0;
      const expiredUnits =
        typeof typedEntry.expiredUnits === "number" && typedEntry.expiredUnits >= 0
          ? Math.floor(typedEntry.expiredUnits)
          : 0;
      const nearExpiryUnits =
        typeof typedEntry.nearExpiryUnits === "number" && typedEntry.nearExpiryUnits >= 0
          ? Math.floor(typedEntry.nearExpiryUnits)
          : 0;
      const nextExpiryDate =
        typeof typedEntry.nextExpiryDate === "string" && typedEntry.nextExpiryDate
          ? typedEntry.nextExpiryDate
          : "";
      const warningDays = getProductWarningDays(productId);

      const batches = normalizeBatches(typedEntry.batches);

      const normalizedBatches = batches.length
        ? batches
        : fallbackBatchesFromSummary(
            storeId,
            productId,
            onHand,
            expiredUnits,
            nearExpiryUnits,
            nextExpiryDate,
          );

      const derived = deriveInventoryFromBatches(normalizedBatches, warningDays);

      if (!storeId || !productId) return null;

      return {
        storeId,
        productId,
        batches: normalizedBatches,
        ...derived,
      };
    })
    .filter(Boolean) as StoreInventoryItem[];
}

function cloneInitialState(): PrototypeStateData {
  return {
    storeInventory: initialStoreInventory.map(item => ({
      ...item,
      batches: item.batches.map(batch => ({...batch})),
    })),
    inventoryTransactions: initialInventoryTransactions.map(item => ({...item})),
    customerOrders: initialCustomerOrders.map(order => ({
      ...order,
      items: order.items.map(item => ({...item})),
    })),
    customerProfiles: initialCustomerProfiles.map(profile => ({...profile})),
    reorderRequests: initialReorderRequests.map(request => ({
      ...request,
      items: request.items.map(item => ({...item})),
    })),
    shippingOrders: initialShippingOrders.map(order => ({
      ...order,
      items: order.items.map(item => ({...item})),
      statusHistory: order.statusHistory.map(event => ({...event})),
    })),
    preferredRole: "store",
    selectedStoreId: stores[0]?.id ?? "",
  };
}

function normalizeInventoryTransactions(value: unknown): InventoryTransaction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null;

      const typedEntry = entry as {
        id?: unknown;
        storeId?: unknown;
        productId?: unknown;
        movementType?: unknown;
        quantity?: unknown;
        occurredAt?: unknown;
        reference?: unknown;
        note?: unknown;
        batchId?: unknown;
        expiryDate?: unknown;
        expiryStatus?: unknown;
      };

      const id = typeof typedEntry.id === "string" ? typedEntry.id : "";
      const storeId = typeof typedEntry.storeId === "string" ? typedEntry.storeId : "";
      const productId =
        typeof typedEntry.productId === "string" ? typedEntry.productId : "";
      const movementType =
        typedEntry.movementType === "IN" ||
        typedEntry.movementType === "OUT" ||
        typedEntry.movementType === "ADJUSTMENT"
          ? typedEntry.movementType
          : null;
      const quantity =
        typeof typedEntry.quantity === "number" && typedEntry.quantity > 0
          ? Math.floor(typedEntry.quantity)
          : 0;
      const occurredAt =
        typeof typedEntry.occurredAt === "string" ? typedEntry.occurredAt : "";
      const reference =
        typeof typedEntry.reference === "string" ? typedEntry.reference : "";
      const note = typeof typedEntry.note === "string" ? typedEntry.note : "";
      const batchId =
        typeof typedEntry.batchId === "string" ? typedEntry.batchId : undefined;
      const expiryDate =
        typeof typedEntry.expiryDate === "string" ? typedEntry.expiryDate : undefined;
      const expiryStatus =
        typedEntry.expiryStatus === "Healthy" ||
        typedEntry.expiryStatus === "Near Expiry" ||
        typedEntry.expiryStatus === "Expired"
          ? typedEntry.expiryStatus
          : undefined;

      if (
        !id ||
        !storeId ||
        !productId ||
        !movementType ||
        !quantity ||
        !occurredAt ||
        !reference
      ) {
        return null;
      }

      return {
        id,
        storeId,
        productId,
        movementType,
        quantity,
        occurredAt,
        reference,
        note,
        batchId,
        expiryDate,
        expiryStatus,
      };
    })
    .filter(Boolean) as InventoryTransaction[];
}

function normalizeCustomerProfiles(value: unknown): CustomerProfile[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(profile => {
      if (!profile || typeof profile !== "object") return null;

      const typedProfile = profile as {
        id?: unknown;
        fullName?: unknown;
        phone?: unknown;
        email?: unknown;
        address?: unknown;
        notes?: unknown;
        preferredStoreId?: unknown;
        lastOrderRef?: unknown;
        lastServedAt?: unknown;
      };

      const id = typeof typedProfile.id === "string" ? typedProfile.id : "";
      const fullName =
        typeof typedProfile.fullName === "string" ? typedProfile.fullName : "";
      const phone = typeof typedProfile.phone === "string" ? typedProfile.phone : "";
      const email = typeof typedProfile.email === "string" ? typedProfile.email : "";
      const address = typeof typedProfile.address === "string" ? typedProfile.address : "";
      const notes = typeof typedProfile.notes === "string" ? typedProfile.notes : "";
      const preferredStoreId =
        typeof typedProfile.preferredStoreId === "string"
          ? typedProfile.preferredStoreId
          : "";
      const lastOrderRef =
        typeof typedProfile.lastOrderRef === "string" ? typedProfile.lastOrderRef : "";
      const lastServedAt =
        typeof typedProfile.lastServedAt === "string" ? typedProfile.lastServedAt : "";

      if (!id || !fullName || !phone || !preferredStoreId) return null;

      return {
        id,
        fullName,
        phone,
        email,
        address,
        notes,
        preferredStoreId,
        lastOrderRef,
        lastServedAt,
      };
    })
    .filter(Boolean) as CustomerProfile[];
}

function isValidRole(value: unknown): value is Role {
  return value === "store" || value === "warehouse" || value === "stakeholder";
}

function isValidStoreId(value: unknown): value is string {
  return typeof value === "string" && stores.some(store => store.id === value);
}

function normalizeCustomerOrders(value: unknown): CustomerOrder[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(order => {
      if (!order || typeof order !== "object") return null;

      const typedOrder = order as {
        id?: unknown;
        storeId?: unknown;
        customerId?: unknown;
        customerName?: unknown;
        customerPhone?: unknown;
        customerEmail?: unknown;
        customerAddress?: unknown;
        customerNotes?: unknown;
        orderRef?: unknown;
        servedAt?: unknown;
        items?: unknown;
        productId?: unknown;
        quantity?: unknown;
      };

      const id = typeof typedOrder.id === "string" ? typedOrder.id : "";
      const storeId = typeof typedOrder.storeId === "string" ? typedOrder.storeId : "";
      const customerId =
        typeof typedOrder.customerId === "string" ? typedOrder.customerId : "";
      const customerName =
        typeof typedOrder.customerName === "string" ? typedOrder.customerName : "";
      const customerPhone =
        typeof typedOrder.customerPhone === "string" ? typedOrder.customerPhone : "";
      const customerEmail =
        typeof typedOrder.customerEmail === "string" ? typedOrder.customerEmail : "";
      const customerAddress =
        typeof typedOrder.customerAddress === "string" ? typedOrder.customerAddress : "";
      const customerNotes =
        typeof typedOrder.customerNotes === "string" ? typedOrder.customerNotes : "";
      const orderRef = typeof typedOrder.orderRef === "string" ? typedOrder.orderRef : "";
      const servedAt = typeof typedOrder.servedAt === "string" ? typedOrder.servedAt : "";

      const nextItems = Array.isArray(typedOrder.items)
        ? typedOrder.items
            .map(item => {
              if (!item || typeof item !== "object") return null;
              const typedItem = item as {
                productId?: unknown;
                quantity?: unknown;
                batchId?: unknown;
                expiryDate?: unknown;
              };
              if (typeof typedItem.productId !== "string") return null;
              const quantity =
                typeof typedItem.quantity === "number" && typedItem.quantity > 0
                  ? Math.floor(typedItem.quantity)
                  : 0;
              if (!quantity) return null;
              return {
                productId: typedItem.productId,
                quantity,
                batchId:
                  typeof typedItem.batchId === "string" ? typedItem.batchId : undefined,
                expiryDate:
                  typeof typedItem.expiryDate === "string"
                    ? typedItem.expiryDate
                    : undefined,
              };
            })
            .filter(Boolean)
        : [];

      // Supports old single-item order shape for backward compatibility.
      const legacyItems =
        !nextItems.length &&
        typeof typedOrder.productId === "string" &&
        typeof typedOrder.quantity === "number" &&
        typedOrder.quantity > 0
          ? [{productId: typedOrder.productId, quantity: Math.floor(typedOrder.quantity)}]
          : [];

      const items = nextItems.length ? nextItems : legacyItems;

      if (!id || !storeId || !customerName || !orderRef || !servedAt || !items.length) {
        return null;
      }

      return {
        id,
        storeId,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerNotes,
        orderRef,
        servedAt,
        items,
      };
    })
    .filter(Boolean) as CustomerOrder[];
}

function normalizeShippingOrders(
  value: unknown,
  reorderRequests: ReorderRequest[],
): ShippingOrder[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(order => {
      if (!order || typeof order !== "object") return null;

      const typedOrder = order as {
        id?: unknown;
        requestId?: unknown;
        storeId?: unknown;
        shipDate?: unknown;
        eta?: unknown;
        status?: unknown;
        items?: unknown;
        carrier?: unknown;
        trackingCode?: unknown;
        currentLocation?: unknown;
        statusHistory?: unknown;
      };

      const id = typeof typedOrder.id === "string" ? typedOrder.id : "";
      const requestId =
        typeof typedOrder.requestId === "string" ? typedOrder.requestId : "";
      const storeId = typeof typedOrder.storeId === "string" ? typedOrder.storeId : "";
      const shipDate = typeof typedOrder.shipDate === "string" ? typedOrder.shipDate : "";
      const eta = typeof typedOrder.eta === "string" ? typedOrder.eta : "";
      const status =
        typedOrder.status === "Draft" ||
        typedOrder.status === "Packed" ||
        typedOrder.status === "In Transit" ||
        typedOrder.status === "Delivered"
          ? typedOrder.status
          : "Draft";
      const carrier =
        typeof typedOrder.carrier === "string" && typedOrder.carrier.trim().length
          ? typedOrder.carrier
          : "Cebu Health Logistics";
      const trackingCode =
        typeof typedOrder.trackingCode === "string" && typedOrder.trackingCode.trim().length
          ? typedOrder.trackingCode
          : `DEMO-${id.toUpperCase()}`;
      const currentLocation =
        typeof typedOrder.currentLocation === "string" &&
        typedOrder.currentLocation.trim().length
          ? typedOrder.currentLocation
          : "Cebu Distribution Center";
      const fallbackExpiryDate =
        typeof eta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(eta)
          ? eta
          : typeof shipDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(shipDate)
            ? shipDate
            : formatDate(new Date());

      const parsedItems = Array.isArray(typedOrder.items)
        ? typedOrder.items
            .map((item, index) => {
              if (!item || typeof item !== "object") return null;
              const typedItem = item as {
                productId?: unknown;
                quantity?: unknown;
                batchId?: unknown;
                expiryDate?: unknown;
              };
              if (typeof typedItem.productId !== "string") return null;
              const quantity =
                typeof typedItem.quantity === "number" && typedItem.quantity > 0
                  ? Math.floor(typedItem.quantity)
                  : 0;
              if (!quantity) return null;
              const resolvedBatchId =
                typeof typedItem.batchId === "string" && typedItem.batchId.trim().length
                  ? typedItem.batchId
                  : `${id}-${typedItem.productId}-line-${index + 1}`;
              const resolvedExpiryDate =
                typeof typedItem.expiryDate === "string" &&
                typedItem.expiryDate.trim().length
                  ? typedItem.expiryDate
                  : fallbackExpiryDate;
              return {
                productId: typedItem.productId,
                quantity,
                batchId: resolvedBatchId,
                expiryDate: resolvedExpiryDate,
              };
            })
            .filter(Boolean)
        : [];

      const fallbackItems =
        !parsedItems.length && requestId
          ? (reorderRequests.find(request => request.id === requestId)?.items ?? []).map(
              (item, index) => ({
                productId: item.productId,
                quantity: item.requestedQty,
                batchId: `${id}-${item.productId}-fallback-${index + 1}`,
                expiryDate: fallbackExpiryDate,
              }),
            )
          : [];

      const items = (
        parsedItems.length ? parsedItems : fallbackItems
      ) as ShippingOrderItem[];

      if (!id || !requestId || !storeId || !shipDate || !eta || !items.length) {
        return null;
      }

      const statusHistory = normalizeStatusHistory(
        typedOrder.statusHistory,
        shipDate,
        status,
        currentLocation,
      );

      return {
        id,
        requestId,
        storeId,
        shipDate,
        eta,
        status,
        items,
        carrier,
        trackingCode,
        currentLocation,
        statusHistory,
      };
    })
    .filter(Boolean) as ShippingOrder[];
}

function normalizeStatusHistory(
  value: unknown,
  shipDate: string,
  currentStatus: ShippingStatus,
  currentLocation: string,
): ShippingStatusEvent[] {
  if (!Array.isArray(value)) {
    return [
      {
        status: currentStatus,
        occurredAt: `${shipDate}T09:00:00.000Z`,
        location: currentLocation,
        note: "Status recorded",
      },
    ];
  }

  const history = value
    .map(entry => {
      if (!entry || typeof entry !== "object") return null;
      const typedEntry = entry as {
        status?: unknown;
        occurredAt?: unknown;
        location?: unknown;
        note?: unknown;
      };

      const status =
        typedEntry.status === "Draft" ||
        typedEntry.status === "Packed" ||
        typedEntry.status === "In Transit" ||
        typedEntry.status === "Delivered"
          ? typedEntry.status
          : null;
      const occurredAt =
        typeof typedEntry.occurredAt === "string" ? typedEntry.occurredAt : "";
      const location = typeof typedEntry.location === "string" ? typedEntry.location : "";
      const note = typeof typedEntry.note === "string" ? typedEntry.note : "Status update";

      if (!status || !occurredAt || !location) {
        return null;
      }

      return {status, occurredAt, location, note};
    })
    .filter(Boolean) as ShippingStatusEvent[];

  if (history.length) return history;

  return [
    {
      status: currentStatus,
      occurredAt: `${shipDate}T09:00:00.000Z`,
      location: currentLocation,
      note: "Status recorded",
    },
  ];
}

function buildShipmentLocation(status: ShippingStatus, storeName: string): string {
  if (status === "Draft" || status === "Packed") return "Cebu Distribution Center";
  if (status === "In Transit") return "In Transit to branch";
  return storeName;
}

function buildStatusNote(status: ShippingStatus): string {
  if (status === "Draft") return "Dispatch drafted by warehouse team";
  if (status === "Packed") return "Shipment packed and validated";
  if (status === "In Transit") return "Shipment has departed warehouse";
  return "Shipment delivered to branch";
}

function classifyExpiryStatus(productId: string, expiryDate: string): ExpiryStatus {
  const now = Date.now();
  const expiryMs = parseExpiryDateToMs(expiryDate);
  if (expiryMs < now) return "Expired";

  const warningDays = getProductWarningDays(productId);
  const daysToExpiry = Math.floor((expiryMs - now) / DAY_IN_MS);
  return daysToExpiry <= warningDays ? "Near Expiry" : "Healthy";
}

function buildDispatchBatchItems(
  requestId: string,
  items: ReorderRequest["items"],
): ShippingOrderItem[] {
  const now = Date.now();

  return items
    .flatMap(item => {
      const safeQty =
        Number.isFinite(item.requestedQty) && item.requestedQty > 0
          ? Math.floor(item.requestedQty)
          : 0;
      if (!safeQty) return [];

      const warningDays = getProductWarningDays(item.productId);
      const nearExpiryQty = safeQty >= 4 ? Math.floor(safeQty * 0.35) : 0;
      const healthyQty = safeQty - nearExpiryQty;
      const lines: ShippingOrderItem[] = [];

      if (nearExpiryQty > 0) {
        lines.push({
          productId: item.productId,
          quantity: nearExpiryQty,
          batchId: `wh-${requestId}-${item.productId}-near`,
          expiryDate: formatDate(new Date(now + Math.max(2, warningDays - 5) * DAY_IN_MS)),
        });
      }

      if (healthyQty > 0) {
        lines.push({
          productId: item.productId,
          quantity: healthyQty,
          batchId: `wh-${requestId}-${item.productId}-healthy`,
          expiryDate: formatDate(new Date(now + (warningDays + 90) * DAY_IN_MS)),
        });
      }

      return lines;
    })
    .sort(
      (a, b) =>
        parseExpiryDateToMs(a.expiryDate ?? "") - parseExpiryDateToMs(b.expiryDate ?? ""),
    );
}

function loadState(): PrototypeStateData {
  const fallback = cloneInitialState();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PrototypeStateData>;
    const normalizedReorderRequests = Array.isArray(parsed.reorderRequests)
      ? parsed.reorderRequests
      : fallback.reorderRequests;

    return {
      storeInventory: Array.isArray(parsed.storeInventory)
        ? normalizeStoreInventory(parsed.storeInventory)
        : fallback.storeInventory,
      inventoryTransactions: normalizeInventoryTransactions(parsed.inventoryTransactions),
      customerOrders: normalizeCustomerOrders(parsed.customerOrders),
      customerProfiles: Array.isArray(parsed.customerProfiles)
        ? normalizeCustomerProfiles(parsed.customerProfiles)
        : fallback.customerProfiles,
      reorderRequests: normalizedReorderRequests,
      shippingOrders: Array.isArray(parsed.shippingOrders)
        ? normalizeShippingOrders(parsed.shippingOrders, normalizedReorderRequests)
        : fallback.shippingOrders,
      preferredRole: isValidRole(parsed.preferredRole)
        ? parsed.preferredRole
        : fallback.preferredRole,
      selectedStoreId: isValidStoreId(parsed.selectedStoreId)
        ? parsed.selectedStoreId
        : fallback.selectedStoreId,
    };
  } catch {
    return fallback;
  }
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildReorderId(existing: ReorderRequest[]): string {
  const max = existing
    .map(request => Number(request.id.replace("req-", "")))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 1000);

  return `req-${max + 1}`;
}

function buildShippingId(existing: ShippingOrder[]): string {
  const max = existing
    .map(order => Number(order.id.replace("ship-", "")))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 700);

  return `ship-${max + 1}`;
}

function buildCustomerOrderId(existing: CustomerOrder[]): string {
  const max = existing
    .map(order => Number(order.id.replace("ord-", "")))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 5000);

  return `ord-${max + 1}`;
}

function buildCustomerProfileId(existing: CustomerProfile[]): string {
  const max = existing
    .map(profile => Number(profile.id.replace("cst-", "")))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 100);

  return `cst-${max + 1}`;
}

function buildInventoryTransactionId(existing: InventoryTransaction[]): string {
  const max = existing
    .map(transaction => Number(transaction.id.replace("txn-", "")))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 0);

  return `txn-${max + 1}`;
}

export function PrototypeStateProvider({children}: PropsWithChildren) {
  const [state, setState] = useState<PrototypeStateData>(() => loadState());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<PrototypeStateContextValue>(
    () => ({
      ...state,
      recordInventoryMovement: (storeId, productId, movementType, quantity) => {
        const safeQty =
          Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
        if (!safeQty) return;

        setState(previous => {
          const timestamp = new Date().toISOString();
          const nextTransaction: InventoryTransaction = {
            id: buildInventoryTransactionId(previous.inventoryTransactions),
            storeId,
            productId,
            movementType,
            quantity: safeQty,
            occurredAt: timestamp,
            reference: "manual-adjustment",
            note: movementType === "ADJUSTMENT" ? "Inventory adjustment" : "Manual update",
          };

          return {
            ...previous,
            storeInventory: previous.storeInventory.map(item => {
              if (item.storeId !== storeId || item.productId !== productId) {
                return item;
              }

              const warningDays = getProductWarningDays(productId);
              let nextBatches = [...item.batches];

              if (movementType === "IN") {
                nextBatches = [
                  ...nextBatches,
                  {
                    batchId: `manual-${Date.now()}-${productId}`,
                    quantity: safeQty,
                    expiryDate: formatDate(
                      new Date(Date.now() + (warningDays + 60) * DAY_IN_MS),
                    ),
                  },
                ];
              } else {
                let remaining = safeQty;
                nextBatches = [...nextBatches]
                  .sort(
                    (a, b) =>
                      parseExpiryDateToMs(a.expiryDate) - parseExpiryDateToMs(b.expiryDate),
                  )
                  .map(batch => {
                    if (remaining <= 0) return batch;
                    const deduction = Math.min(batch.quantity, remaining);
                    remaining -= deduction;
                    return {...batch, quantity: batch.quantity - deduction};
                  })
                  .filter(batch => batch.quantity > 0);
              }

              const derived = deriveInventoryFromBatches(nextBatches, warningDays);
              return {
                ...item,
                batches: nextBatches,
                ...derived,
              };
            }),
            inventoryTransactions: [nextTransaction, ...previous.inventoryTransactions],
          };
        });
      },
      createReorderRequest: input => {
        let createdId = "";

        setState(previous => {
          const nextId = buildReorderId(previous.reorderRequests);
          createdId = nextId;

          const nextRequest: ReorderRequest = {
            id: nextId,
            storeId: input.storeId,
            createdAt: formatDate(new Date()),
            priority: input.priority,
            status: input.status,
            items: input.items.map(item => ({...item})),
          };

          return {
            ...previous,
            reorderRequests: [nextRequest, ...previous.reorderRequests],
          };
        });

        return createdId;
      },
      createShippingOrder: input => {
        let createdId: string | null = null;

        setState(previous => {
          const request = previous.reorderRequests.find(
            item => item.id === input.requestId,
          );
          if (!request) return previous;

          const nextId = buildShippingId(previous.shippingOrders);
          createdId = nextId;

          const shipDate = new Date();
          const etaDate = new Date();
          etaDate.setDate(shipDate.getDate() + 2);

          const nextOrder: ShippingOrder = {
            id: nextId,
            requestId: request.id,
            storeId: request.storeId,
            shipDate: formatDate(shipDate),
            eta: formatDate(etaDate),
            status: input.status,
            items: buildDispatchBatchItems(request.id, request.items),
            carrier: "Cebu Health Logistics",
            trackingCode: `DEMO-${nextId.toUpperCase()}`,
            currentLocation: buildShipmentLocation(
              input.status,
              stores.find(store => store.id === request.storeId)?.name ??
                "Destination branch",
            ),
            statusHistory: [
              {
                status: input.status,
                occurredAt: new Date().toISOString(),
                location: buildShipmentLocation(
                  input.status,
                  stores.find(store => store.id === request.storeId)?.name ??
                    "Destination branch",
                ),
                note: buildStatusNote(input.status),
              },
            ],
          };

          return {
            ...previous,
            reorderRequests: previous.reorderRequests.map(item =>
              item.id === request.id
                ? {
                    ...item,
                    status: input.status === "Packed" ? "Fulfilled" : "Approved",
                  }
                : item,
            ),
            shippingOrders: [nextOrder, ...previous.shippingOrders],
          };
        });

        return createdId;
      },
      updateShippingStatus: (shipmentId, nextStatus) => {
        let updatedId: string | null = null;

        setState(previous => {
          const shipment = previous.shippingOrders.find(order => order.id === shipmentId);
          if (!shipment) return previous;

          const transitionAllowed =
            (shipment.status === "Draft" && nextStatus === "Packed") ||
            (shipment.status === "Packed" && nextStatus === "In Transit") ||
            (shipment.status === "In Transit" && nextStatus === "Delivered");

          if (!transitionAllowed) return previous;

          updatedId = shipment.id;
          const storeName =
            stores.find(store => store.id === shipment.storeId)?.name ??
            "Destination branch";
          const nextLocation = buildShipmentLocation(nextStatus, storeName);
          const nextEvent: ShippingStatusEvent = {
            status: nextStatus,
            occurredAt: new Date().toISOString(),
            location: nextLocation,
            note: buildStatusNote(nextStatus),
          };

          return {
            ...previous,
            shippingOrders: previous.shippingOrders.map(order =>
              order.id === shipment.id
                ? {
                    ...order,
                    status: nextStatus,
                    currentLocation: nextLocation,
                    statusHistory: [...order.statusHistory, nextEvent],
                  }
                : order,
            ),
            reorderRequests: previous.reorderRequests.map(request =>
              request.id === shipment.requestId
                ? {
                    ...request,
                    status: nextStatus === "Delivered" ? "Fulfilled" : request.status,
                  }
                : request,
            ),
          };
        });

        return updatedId;
      },
      receiveShipment: shipmentId => {
        let receivedId: string | null = null;

        setState(previous => {
          const shipment = previous.shippingOrders.find(order => order.id === shipmentId);
          if (!shipment) return previous;

          if (!(shipment.status === "Packed" || shipment.status === "In Transit")) {
            return previous;
          }

          receivedId = shipment.id;
          const timestamp = new Date().toISOString();
          const storeName =
            stores.find(store => store.id === shipment.storeId)?.name ??
            "Destination branch";
          const shipmentItemsByProduct = shipment.items.reduce(
            (acc, item) => {
              const group = acc[item.productId] ?? [];
              group.push(item);
              acc[item.productId] = group;
              return acc;
            },
            {} as Record<string, ShippingOrderItem[]>,
          );

          let transactionSeed = previous.inventoryTransactions;
          const transactions = shipment.items.map((item, index) => {
            const inboundExpiryDate =
              item.expiryDate ?? formatDate(new Date(Date.now() + 120 * DAY_IN_MS));
            const nextTransaction: InventoryTransaction = {
              id: buildInventoryTransactionId(transactionSeed),
              storeId: shipment.storeId,
              productId: item.productId,
              movementType: "IN",
              quantity: item.quantity,
              occurredAt: timestamp,
              reference: shipment.id,
              note: "Shipment received (batch intake)",
              batchId: item.batchId ?? `${shipment.id}-${item.productId}-${index + 1}`,
              expiryDate: inboundExpiryDate,
              expiryStatus: classifyExpiryStatus(item.productId, inboundExpiryDate),
            };
            transactionSeed = [nextTransaction, ...transactionSeed];
            return nextTransaction;
          });

          return {
            ...previous,
            storeInventory: previous.storeInventory.map(item =>
              item.storeId === shipment.storeId &&
              shipmentItemsByProduct[item.productId]?.length
                ? {
                    ...item,
                    batches: [
                      ...item.batches,
                      ...shipmentItemsByProduct[item.productId].map(
                        (shipmentItem, lineIndex) => ({
                          batchId:
                            shipmentItem.batchId ??
                            `${shipment.id}-${item.productId}-${lineIndex + 1}`,
                          quantity: shipmentItem.quantity,
                          expiryDate:
                            shipmentItem.expiryDate ??
                            formatDate(new Date(Date.now() + 120 * DAY_IN_MS)),
                        }),
                      ),
                    ],
                    ...deriveInventoryFromBatches(
                      [
                        ...item.batches,
                        ...shipmentItemsByProduct[item.productId].map(
                          (shipmentItem, lineIndex) => ({
                            batchId:
                              shipmentItem.batchId ??
                              `${shipment.id}-${item.productId}-${lineIndex + 1}`,
                            quantity: shipmentItem.quantity,
                            expiryDate:
                              shipmentItem.expiryDate ??
                              formatDate(new Date(Date.now() + 120 * DAY_IN_MS)),
                          }),
                        ),
                      ],
                      getProductWarningDays(item.productId),
                    ),
                  }
                : item,
            ),
            shippingOrders: previous.shippingOrders.map(order =>
              order.id === shipment.id
                ? {
                    ...order,
                    status: "Delivered",
                    currentLocation: storeName,
                    statusHistory: [...order.statusHistory].some(
                      event => event.status === "Delivered",
                    )
                      ? order.statusHistory
                      : [
                          ...order.statusHistory,
                          {
                            status: "Delivered",
                            occurredAt: timestamp,
                            location: storeName,
                            note: "Shipment delivered to branch",
                          },
                        ],
                  }
                : order,
            ),
            inventoryTransactions: [...transactions, ...previous.inventoryTransactions],
          };
        });

        return receivedId;
      },
      serveCustomerOrder: input => {
        let createdId: string | null = null;

        setState(previous => {
          const normalizedItems = input.items
            .map(item => {
              const quantity =
                Number.isFinite(item.quantity) && item.quantity > 0
                  ? Math.floor(item.quantity)
                  : 0;
              if (!quantity) return null;
              return {productId: item.productId, quantity};
            })
            .filter(Boolean) as Array<{productId: string; quantity: number}>;

          if (!normalizedItems.length) return previous;

          const groupedItems = normalizedItems.reduce(
            (acc, item) => {
              const current = acc[item.productId] ?? 0;
              acc[item.productId] = current + item.quantity;
              return acc;
            },
            {} as Record<string, number>,
          );

          const hasStock = Object.entries(groupedItems).every(([productId, quantity]) => {
            const targetItem = previous.storeInventory.find(
              item => item.storeId === input.storeId && item.productId === productId,
            );
            return Boolean(targetItem && getUsableStock(targetItem) >= quantity);
          });

          if (!hasStock) return previous;

          const allAllocations: BatchAllocation[] = [];
          for (const [productId, quantity] of Object.entries(groupedItems)) {
            const inventoryItem = previous.storeInventory.find(
              item => item.storeId === input.storeId && item.productId === productId,
            );
            if (!inventoryItem) return previous;

            const allocation = allocateFefoBatches(inventoryItem, quantity);
            if (!allocation) return previous;
            allAllocations.push(...allocation);
          }

          const nextId = buildCustomerOrderId(previous.customerOrders);
          createdId = nextId;

          const nextOrder: CustomerOrder = {
            id: nextId,
            storeId: input.storeId,
            customerId: input.customerId ?? "",
            customerName: input.customerName.trim(),
            customerPhone: input.customerPhone.trim(),
            customerEmail: input.customerEmail.trim(),
            customerAddress: input.customerAddress.trim(),
            customerNotes: input.customerNotes.trim(),
            orderRef: input.orderRef.trim(),
            items: allAllocations.map(allocation => ({
              productId: allocation.productId,
              quantity: allocation.quantity,
              batchId: allocation.batchId,
              expiryDate: allocation.expiryDate,
            })),
            servedAt: new Date().toISOString(),
          };

          let transactionSeed = previous.inventoryTransactions;
          const transactions = allAllocations.map(allocation => {
            const nextTransaction: InventoryTransaction = {
              id: buildInventoryTransactionId(transactionSeed),
              storeId: input.storeId,
              productId: allocation.productId,
              movementType: "OUT",
              quantity: allocation.quantity,
              occurredAt: nextOrder.servedAt,
              reference: nextOrder.id,
              note: `Customer order ${nextOrder.orderRef} (FEFO batch deduction)`,
              batchId: allocation.batchId,
              expiryDate: allocation.expiryDate,
              expiryStatus: allocation.expiryStatus,
            };
            transactionSeed = [nextTransaction, ...transactionSeed];
            return nextTransaction;
          });

          const allocationByProduct = allAllocations.reduce(
            (acc, allocation) => {
              const group = acc[allocation.productId] ?? [];
              group.push(allocation);
              acc[allocation.productId] = group;
              return acc;
            },
            {} as Record<string, BatchAllocation[]>,
          );

          return {
            ...previous,
            storeInventory: previous.storeInventory.map(item =>
              item.storeId === input.storeId && allocationByProduct[item.productId]
                ? (() => {
                    const allocations = allocationByProduct[item.productId];
                    const nextBatches = item.batches
                      .map(batch => {
                        const deduction = allocations
                          .filter(allocation => allocation.batchId === batch.batchId)
                          .reduce((acc, allocation) => acc + allocation.quantity, 0);
                        return {
                          ...batch,
                          quantity: Math.max(0, batch.quantity - deduction),
                        };
                      })
                      .filter(batch => batch.quantity > 0);
                    return {
                      ...item,
                      batches: nextBatches,
                      ...deriveInventoryFromBatches(
                        nextBatches,
                        getProductWarningDays(item.productId),
                      ),
                    };
                  })()
                : item,
            ),
            customerProfiles: (() => {
              const normalizedName = nextOrder.customerName.toLowerCase();
              const normalizedPhone = nextOrder.customerPhone;
              const existingCustomer = previous.customerProfiles.find(profile => {
                return (
                  profile.preferredStoreId === input.storeId &&
                  profile.fullName.toLowerCase() === normalizedName &&
                  profile.phone === normalizedPhone
                );
              });

              if (existingCustomer) {
                return previous.customerProfiles.map(profile =>
                  profile.id === existingCustomer.id
                    ? {
                        ...profile,
                        fullName: nextOrder.customerName,
                        email: nextOrder.customerEmail,
                        address: nextOrder.customerAddress,
                        notes: nextOrder.customerNotes,
                        preferredStoreId: input.storeId,
                        lastOrderRef: nextOrder.orderRef,
                        lastServedAt: nextOrder.servedAt,
                      }
                    : profile,
                );
              }

              return [
                {
                  id: buildCustomerProfileId(previous.customerProfiles),
                  fullName: nextOrder.customerName,
                  phone: nextOrder.customerPhone,
                  email: nextOrder.customerEmail,
                  address: nextOrder.customerAddress,
                  notes: nextOrder.customerNotes,
                  preferredStoreId: input.storeId,
                  lastOrderRef: nextOrder.orderRef,
                  lastServedAt: nextOrder.servedAt,
                },
                ...previous.customerProfiles,
              ];
            })(),
            customerOrders: [nextOrder, ...previous.customerOrders],
            inventoryTransactions: [...transactions, ...previous.inventoryTransactions],
          };
        });

        return createdId;
      },
      setPreferredRole: role => {
        setState(previous => ({...previous, preferredRole: role}));
      },
      setSelectedStoreId: storeId => {
        if (!isValidStoreId(storeId)) return;
        setState(previous => ({...previous, selectedStoreId: storeId}));
      },
      resetPrototypeData: () => {
        setState(cloneInitialState());
      },
    }),
    [state],
  );

  return (
    <PrototypeStateContext.Provider value={value}>
      {children}
    </PrototypeStateContext.Provider>
  );
}
