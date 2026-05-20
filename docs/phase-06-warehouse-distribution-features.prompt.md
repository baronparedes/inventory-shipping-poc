---
mode: agent
description: Phase 6 — Warehouse (Distribution Center) Frontend Features
---

# Phase 6: Warehouse (Distribution Center) Frontend Features

## Context

All store-side features are complete from Phase 5. This phase implements all **Distribution Center (WAREHOUSE role)** screens, connecting to the backend API via React Query hooks. The WAREHOUSE role has network-wide visibility across all branches.

All warehouse routes are protected under `/warehouse/*` and accessible only to users with the `WAREHOUSE` role.

---

## Feature: Warehouse Dashboard (`/warehouse`)

### Data

Fetch in parallel:

- `GET /api/stores` — list of all stores
- `GET /api/inventory` — all inventory items (all stores), for low-stock aggregation
- `GET /api/reorder-requests?status=PENDING,APPROVED` — open refill requests needing attention
- `GET /api/shipping?status=DRAFT,PACKED,IN_TRANSIT` — active dispatches in flight

### Hook: `src/features/warehouse/useWarehouseDashboard.ts`

Returns:

```ts
{
  storeCount: number;
  networkLowStockCount: number;  // items below threshold across all stores
  openRequestCount: number;
  activeShipmentCount: number;
  stores: Store[];
  isLoading: boolean;
}
```

### UI

- **Stat cards**: Total Branches, Network Low-Stock Items, Open Refill Requests, Active Dispatches
- **Branch Health table**: one row per store — Store Name, City, Total Items, Low-Stock Count, Last Shipment Status
  - Low-Stock Count shown as a warning badge when > 0
- **Quick Links**: "Review Refill Requests" → `/warehouse/shipping`, "Monitor Inventory" → `/warehouse/monitor`

---

## Feature: Branch Inventory Monitor (`/warehouse/monitor`)

### Hooks

- **`useAllInventory()`** — `GET /api/inventory` — all stores, all products
- **`useNetworkTransactions(page)`** — `GET /api/transactions?page=<n>&limit=20`
- **`useStores()`** — `GET /api/stores` — for the store filter dropdown

### UI

**Tab 1: Network Inventory**

Filter bar:

- Store selector dropdown (All Stores, or individual branch)
- Category filter (All, OTC, Prescription, Cold Chain, Supplies)
- Stock status filter (All, Low Stock, Out of Stock)
- Product name/SKU search

Table with columns:

- Store, Product Name, SKU, Category, On-Hand, Threshold, Status badge

Export-to-CSV button: downloads the filtered data as a CSV file (client-side generation using array-to-csv or manual Blob approach).

**Tab 2: Network Movement Ledger**

Table with columns:

- Date/Time, Store, Product Name, Movement (IN badge / OUT badge), Qty, Reference, Note

Filter bar: store selector, movement type (IN/OUT/All), date range (from/to date pickers).

Paginated with `Pagination` component. Default sort: descending `occurredAt`.

---

## Feature: Dispatch Management (`/warehouse/shipping`)

### Hooks

- **`useReorderRequests()`** — `GET /api/reorder-requests` — all requests, WAREHOUSE sees all
- **`useShippingOrders()`** — `GET /api/shipping` — all shipments
- **`useUpdateReorderStatus()`** — `PATCH /api/reorder-requests/:id/status` mutation
- **`useCreateShippingOrder()`** — `POST /api/shipping` mutation
- **`useAdvanceShippingStatus()`** — `PATCH /api/shipping/:id/status` mutation

### UI

**Tab 1: Refill Requests**

Filter bar: status filter (Pending, Approved, Fulfilled, All).

Table with columns:

- Request ID (truncated), Store Name, Priority badge, Status badge, Items count, Date, Actions

Actions per row (based on status):

- `PENDING` → "Approve" button → calls `useUpdateReorderStatus({ status: 'APPROVED' })`, shows confirm dialog first
- `APPROVED` → "Create Dispatch" button → opens **Create Dispatch Modal**
- `FULFILLED` → no action (view only)

**Create Dispatch Modal** (opened from "Create Dispatch" action):

Fields:

- Ship Date (date picker, required)
- ETA (date picker, required, must be after Ship Date)
- Items table (pre-populated from the request's items):
  - Product Name, Requested Qty, Dispatch Qty (editable, min 1, max = warehouse stock for that product)
  - Show current warehouse stock next to each row for reference

Submit → calls `useCreateShippingOrder`, on success: invalidate `['shipping']`, `['reorder-requests']`, show success toast, close modal.

**Tab 2: Active Dispatches**

Filter bar: status filter (Draft, Packed, In Transit, All).

Table with columns:

- Shipment ID (truncated), Store Name, Status badge, Ship Date, ETA, Items count, Actions

Actions per row (based on status):

- `DRAFT` → "Mark Packed" button → calls `useAdvanceShippingStatus({ status: 'PACKED' })` with confirm dialog
- `PACKED` → "Mark In Transit" button → calls `useAdvanceShippingStatus({ status: 'IN_TRANSIT' })` with confirm dialog
- `IN_TRANSIT` → "Awaiting Branch Receipt" label (read-only — branch confirms delivery, not warehouse)

Row click (any status) → opens **Shipment Detail Modal**:

- Header: Store name, Status, Ship Date, ETA
- Items table: Product Name, SKU, Quantity
- Close button

**Tab 3: Dispatch History**

Shows shipments with status `DELIVERED`. Same table structure as Active Dispatches without action buttons.

Pagination supported.

---

## Shared Components (Warehouse-specific)

### `StoreSelector`

A controlled dropdown that lists all stores fetched from `/api/stores`. Used in the WarehouseLayout nav bar and in filter bars. Updates `selectedStoreId` in the Zustand auth store when changed.

### `PriorityBadge`

Renders a colored pill: Low (grey), Medium (amber), High (red).

### `MovementBadge`

Renders IN (green pill) / OUT (red pill) for transaction ledger rows.

### `DateRangePicker`

Simple date range filter with two `<input type="date">` fields (from/to). Emits `{ from: string; to: string }` to parent.

---

## Query Invalidation Map

| Mutation                                    | Invalidates                            |
| ------------------------------------------- | -------------------------------------- |
| `updateReorderStatus (APPROVE)`             | `['reorder-requests']`                 |
| `createShippingOrder`                       | `['shipping']`, `['reorder-requests']` |
| `advanceShippingStatus (PACKED/IN_TRANSIT)` | `['shipping']`                         |

---

## Acceptance Criteria

- [ ] Warehouse dashboard shows correct network-wide counts from real API data
- [ ] Branch Health table lists all stores with accurate low-stock counts
- [ ] Network Inventory tab shows all stores' inventory with working filters
- [ ] Filtering by store shows only that store's inventory rows
- [ ] Network Movement Ledger is paginated and shows store identity per row
- [ ] Refill Request list shows all stores' requests with correct status badges
- [ ] "Approve" action transitions request status to APPROVED and refreshes the list
- [ ] "Create Dispatch" modal pre-populates items from the selected request
- [ ] Dispatch Qty is capped at the product's warehouse stock
- [ ] Created dispatch appears immediately in the Active Dispatches tab
- [ ] Advancing dispatch status (Draft → Packed → In Transit) updates the row correctly
- [ ] Completed shipments (DELIVERED) appear in Dispatch History
- [ ] CSV export in Network Inventory tab downloads the filtered data
- [ ] All views handle loading, error, and empty states
- [ ] TypeScript compiles with zero errors across all new feature files
