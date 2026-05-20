---
mode: agent
description: Phase 5 — Branch (Store) Frontend Features
---

# Phase 5: Branch (Store) Frontend Features

## Context

The frontend foundation from Phase 4 is in place. Auth works, routing is configured, and the API client is set up. This phase implements all **Branch Pharmacy (STORE role)** screens, connecting each view to the live backend API via React Query hooks.

All store routes are protected under `/store/*` and accessible only to users with the `STORE` role. The authenticated user's `storeId` is sourced from the Zustand auth store.

---

## Feature: Store Dashboard (`/store`)

### Data

Fetch in parallel using `useQueries` or individual `useQuery` calls:

- `GET /api/inventory?storeId=<storeId>` — current inventory summary
- `GET /api/inventory/<storeId>/low-stock` — low-stock items
- `GET /api/shipping?storeId=<storeId>&status=PACKED,IN_TRANSIT` — inbound shipments pending receipt
- `GET /api/orders?storeId=<storeId>&limit=5` — recent 5 orders

### Hook: `src/features/store/useDashboardSummary.ts`

Composes the above queries and returns:

```ts
{
  totalProducts: number;
  lowStockCount: number;
  inboundShipmentCount: number;
  recentOrders: CustomerOrder[];
  isLoading: boolean;
}
```

### UI

- **Stat cards**: Total Products, Low-Stock Alerts, Pending Shipments
- **Recent Orders table**: columns — Order Ref, Customer, Items (count), Date
- **Low-Stock Alerts list**: product name, on-hand qty, threshold — with a "Create Reorder" shortcut link

---

## Feature: Store Inventory (`/store/inventory`)

### Hooks

- **`useStoreInventory(storeId)`** — `GET /api/inventory/:storeId` — returns items with joined product details
- **`useInboundShipments(storeId)`** — `GET /api/shipping?status=PACKED,IN_TRANSIT` filtered to store
- **`useReceiveShipment()`** — `PATCH /api/shipping/:id/status` with `{ status: 'DELIVERED' }` mutation

### UI

**Tab 1: On-Hand Stock**

Table with columns:

- Product Name, SKU, Category, On-Hand Qty, Reorder Threshold, Status badge (OK / Low Stock / Out)

Highlight rows where `onHand <= reorderThreshold` in amber, `onHand === 0` in red.

Filter bar: search by product name or SKU, filter by category.

**Tab 2: Inbound Shipments**

Table with columns:

- Shipment ID (truncated), Status badge, ETA date, Items count, Action

Action: "View & Receive" button — opens a **modal**:

- Header: Shipment summary (ETA, status, item count)
- Item list: Product name, SKU, Qty being received
- Footer: "Confirm Receipt" primary button, "Cancel" button
- On confirm: calls `useReceiveShipment` mutation, invalidates `['inventory', storeId]` and `['shipping']`, shows success toast

---

## Feature: New Customer Order (`/store/orders`)

### Hooks

- **`useProducts()`** — `GET /api/products` — for the product search/select
- **`useCreateOrder()`** — `POST /api/orders` mutation

### UI

**Order Form**

Two-panel layout:

**Left panel — Order Header**:

- Customer Name (text input, required)
- Order Reference (text input, required, auto-suggest a format like `ORD-YYYYMMDD-XXX`)
- Summary: item count, total units

**Right panel — Order Items**:

- Product search: type-ahead dropdown filtering products by name or SKU
- Selected product row: Product name, Qty stepper (increment/decrement, min 1), Remove button
- "Add Product" button to add more rows
- Empty state if no items added

**Bottom bar**:

- "Complete Order" primary button
  - Disabled if: `customerName` or `orderRef` is empty, or `items` is empty
  - On click: calls `useCreateOrder`, invalidates `['orders']` and `['inventory', storeId]`
  - On success: show success toast, clear the form
  - On error `INSUFFICIENT_STOCK`: show an inline error message identifying which product has insufficient stock

**Validation rules (client-side)**:

- `customerName`: required
- `orderRef`: required
- At least 1 item
- All item quantities must be positive integers

---

## Feature: Order History (`/store/orders/history`)

### Hook

**`useOrderHistory(storeId, page)`** — `GET /api/orders?page=<n>&limit=20`

### UI

Table with columns:

- Order Ref, Customer Name, Items (count), Date Served

Row click → opens a detail modal:

- Customer name, Order ref, Date served
- Item list: Product name, SKU, Qty dispensed

Pagination controls: Previous / Next with current page indicator.

---

## Feature: Reorder Request (`/store/reorder`)

### Hooks

- **`useLowStockItems(storeId)`** — `GET /api/inventory/:storeId/low-stock`
- **`useCreateReorderRequest()`** — `POST /api/reorder-requests` mutation
- **`useReorderHistory(storeId)`** — `GET /api/reorder-requests?storeId=<storeId>`

### UI

**Tab 1: Create Reorder Request**

Form:

- Priority selector: Low / Medium / High (required)
- Items table: pre-populated from low-stock items — columns: Product Name, On-Hand, Threshold, Requested Qty (editable number input, pre-filled with `threshold - onHand`, minimum 1)
- Toggle checkboxes to include/exclude individual items
- "Submit Reorder Request" primary button
  - Disabled if no items selected or priority not chosen
  - On success: show toast, switch to Tab 2, invalidate `['reorder-requests']`

**Tab 2: Request History**

Table with columns:

- Request ID (truncated), Priority badge, Status badge, Items count, Date

Status badges: Draft (grey), Pending (blue), Approved (amber), Fulfilled (green).

Row click → opens detail modal: priority, status, items list with product name and requested qty.

---

## Shared UI Conventions

### Components to create/reuse

- **`StatusBadge`** — renders colored pill for status values (configurable variant map)
- **`DataTable`** — generic sortable table with empty state slot
- **`Pagination`** — previous/next controls using `meta` from API
- **`Toast`** / notification system — use a lightweight library (e.g. `react-hot-toast`) or a custom context
- **`LoadingSpinner`** — centered spinner for loading states
- **`ErrorMessage`** — standardized inline error display with retry option
- **`ConfirmModal`** — reusable confirm/cancel modal wrapper

All components live in `src/components/`.

### Loading & Error States

Every data-fetching view must handle:

- **Loading**: show `LoadingSpinner` while `isLoading` is true
- **Error**: show `ErrorMessage` with retry when `isError` is true
- **Empty**: show a descriptive empty state message

### Query Invalidation Map

| Mutation               | Invalidates                              |
| ---------------------- | ---------------------------------------- |
| `createOrder`          | `['orders']`, `['inventory', storeId]`   |
| `receiveShipment`      | `['inventory', storeId]`, `['shipping']` |
| `createReorderRequest` | `['reorder-requests']`                   |

---

## Acceptance Criteria

- [ ] Store dashboard loads all 4 data sources and displays stats correctly
- [ ] Inventory tab shows all products with correct low-stock highlighting
- [ ] Inbound shipments list only shows PACKED and IN_TRANSIT shipments for the user's store
- [ ] Receiving a shipment updates inventory and marks the shipment as DELIVERED
- [ ] Customer order cannot be submitted with empty customer name, order ref, or items
- [ ] `INSUFFICIENT_STOCK` error is shown inline on the correct product row
- [ ] Successful order submission clears the form and shows a success toast
- [ ] Order history is paginated and shows item detail on row click
- [ ] Reorder form is pre-populated from low-stock items
- [ ] Submitted reorder request appears immediately in the history tab
- [ ] All views handle loading, error, and empty states
- [ ] TypeScript compiles with zero errors across all new feature files
