import {useEffect, useMemo, useState, type PropsWithChildren} from "react";
import {
  reorderRequests as initialReorderRequests,
  shippingOrders as initialShippingOrders,
  stores,
  storeInventory as initialStoreInventory,
} from "../mocks/mockData";
import type {
  CustomerOrder,
  ReorderRequest,
  Role,
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
  customerOrders: CustomerOrder[];
  reorderRequests: ReorderRequest[];
  shippingOrders: ShippingOrder[];
  preferredRole: Role;
  selectedStoreId: string;
}

function cloneInitialState(): PrototypeStateData {
  return {
    storeInventory: initialStoreInventory.map(item => ({...item})),
    customerOrders: [],
    reorderRequests: initialReorderRequests.map(request => ({
      ...request,
      items: request.items.map(item => ({...item})),
    })),
    shippingOrders: initialShippingOrders.map(order => ({...order})),
    preferredRole: "store",
    selectedStoreId: stores[0]?.id ?? "",
  };
}

function isValidRole(value: unknown): value is Role {
  return value === "store" || value === "warehouse";
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
        customerName?: unknown;
        orderRef?: unknown;
        servedAt?: unknown;
        items?: unknown;
        productId?: unknown;
        quantity?: unknown;
      };

      const id = typeof typedOrder.id === "string" ? typedOrder.id : "";
      const storeId = typeof typedOrder.storeId === "string" ? typedOrder.storeId : "";
      const customerName =
        typeof typedOrder.customerName === "string" ? typedOrder.customerName : "";
      const orderRef = typeof typedOrder.orderRef === "string" ? typedOrder.orderRef : "";
      const servedAt = typeof typedOrder.servedAt === "string" ? typedOrder.servedAt : "";

      const nextItems = Array.isArray(typedOrder.items)
        ? typedOrder.items
            .map(item => {
              if (!item || typeof item !== "object") return null;
              const typedItem = item as {productId?: unknown; quantity?: unknown};
              if (typeof typedItem.productId !== "string") return null;
              const quantity =
                typeof typedItem.quantity === "number" && typedItem.quantity > 0
                  ? Math.floor(typedItem.quantity)
                  : 0;
              if (!quantity) return null;
              return {productId: typedItem.productId, quantity};
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
        customerName,
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

      const parsedItems = Array.isArray(typedOrder.items)
        ? typedOrder.items
            .map(item => {
              if (!item || typeof item !== "object") return null;
              const typedItem = item as {productId?: unknown; quantity?: unknown};
              if (typeof typedItem.productId !== "string") return null;
              const quantity =
                typeof typedItem.quantity === "number" && typedItem.quantity > 0
                  ? Math.floor(typedItem.quantity)
                  : 0;
              if (!quantity) return null;
              return {productId: typedItem.productId, quantity};
            })
            .filter(Boolean)
        : [];

      const fallbackItems =
        !parsedItems.length && requestId
          ? (reorderRequests.find(request => request.id === requestId)?.items ?? []).map(
              item => ({productId: item.productId, quantity: item.requestedQty}),
            )
          : [];

      const items = (
        parsedItems.length ? parsedItems : fallbackItems
      ) as ShippingOrderItem[];

      if (!id || !requestId || !storeId || !shipDate || !eta || !items.length) {
        return null;
      }

      return {id, requestId, storeId, shipDate, eta, status, items};
    })
    .filter(Boolean) as ShippingOrder[];
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
        ? parsed.storeInventory
        : fallback.storeInventory,
      customerOrders: normalizeCustomerOrders(parsed.customerOrders),
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

        setState(previous => ({
          ...previous,
          storeInventory: previous.storeInventory.map(item => {
            if (item.storeId !== storeId || item.productId !== productId) {
              return item;
            }

            const delta = movementType === "IN" ? safeQty : -safeQty;
            return {
              ...item,
              onHand: Math.max(0, item.onHand + delta),
            };
          }),
        }));
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
            items: request.items.map(item => ({
              productId: item.productId,
              quantity: item.requestedQty,
            })),
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

          return {
            ...previous,
            shippingOrders: previous.shippingOrders.map(order =>
              order.id === shipment.id ? {...order, status: nextStatus} : order,
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
          const itemMap = shipment.items.reduce(
            (acc, item) => {
              acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
              return acc;
            },
            {} as Record<string, number>,
          );

          return {
            ...previous,
            storeInventory: previous.storeInventory.map(item =>
              item.storeId === shipment.storeId && itemMap[item.productId]
                ? {...item, onHand: item.onHand + itemMap[item.productId]}
                : item,
            ),
            shippingOrders: previous.shippingOrders.map(order =>
              order.id === shipment.id ? {...order, status: "Delivered"} : order,
            ),
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
            return Boolean(targetItem && targetItem.onHand >= quantity);
          });

          if (!hasStock) return previous;

          const nextId = buildCustomerOrderId(previous.customerOrders);
          createdId = nextId;

          const nextOrder: CustomerOrder = {
            id: nextId,
            storeId: input.storeId,
            customerName: input.customerName.trim(),
            orderRef: input.orderRef.trim(),
            items: Object.entries(groupedItems).map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
            servedAt: new Date().toISOString(),
          };

          return {
            ...previous,
            storeInventory: previous.storeInventory.map(item =>
              item.storeId === input.storeId && groupedItems[item.productId]
                ? {
                    ...item,
                    onHand: Math.max(0, item.onHand - groupedItems[item.productId]),
                  }
                : item,
            ),
            customerOrders: [nextOrder, ...previous.customerOrders],
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
