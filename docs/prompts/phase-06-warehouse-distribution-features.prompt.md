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

## Feature: Distribution Center Inventory Management (`/warehouse/inventory`)

### Hooks

- **`useDCInventory(dcId)`** — `GET /api/inventory?context=dc&contextId=<dcId>` — DC inventory with product details
- **`useDCMovementLedger(dcId, filters)`** — `GET /api/movement-ledgers?context=dc&contextId=<dcId>` — all DC movements
- **`useAdjustDCInventory()`** — `POST /api/inventory/adjustments` mutation (backend provides this)

### UI

**Tab 1: On-Hand Stock**

Table with columns:

- Product Name, SKU, Category, On-Hand Qty, Reserved (for pending dispatches), Available, Status badge

Filter bar: search by product name or SKU, filter by category, status.

**Tab 2: Inventory Adjustments**

Form for recording stock adjustments (loss, damage, audit):

- Product selector (autocomplete, searchable)
- Adjustment Type: "Loss", "Damage", "Audit Correction" (dropdown)
- Quantity (number input, positive integer)
- Notes (text area, optional)
- "Record Adjustment" button:
  - Calls `useAdjustDCInventory()` mutation
  - On success: show toast, refresh inventory, show entry in movement ledger

**Tab 3: Movement Ledger**

Table with columns:

- Date/Time, Product Name, Movement Type badge (IN/OUT/ADJUSTMENT/RETURN), Qty, Reference, Reason/Note

Filter bar:

- Movement type (IN/OUT/ADJUSTMENT/RETURN/All)
- Date range (from/to)
- Product search

Paginated. Default sort: descending `occurredAt`.

---

## Feature: Return Shipment Management (`/warehouse/returns`)

### Hooks

- **`useReturnShipments(filters)`** — `GET /api/returns?status=DRAFT,PACKED,IN_TRANSIT,RECEIVED` — all returns
- **`useUpdateReturnStatus()`** — `PATCH /api/returns/:id/status` mutation

### UI

**Returns List**

Table with columns:

- Return ID (truncated), Store Name, Status badge, Item count, Reason, Date Created, Actions

Filter bar: status filter (Draft, Packed, In Transit, Received, All).

Actions per row (based on status):

- `DRAFT` → "Mark Packed" button
- `PACKED` → "Mark In Transit" button
- `IN_TRANSIT` → "Mark Received" button
- `RECEIVED` → no actions (read-only)

Row click → opens **Return Shipment Detail Modal**:

- Header: Return ID, Store, Reason, Status, Date Created
- Items table: Product Name, Qty Returned, Return Reason (Expired, Damaged, etc.)
- Footer: Status and any available action button (if not RECEIVED)

**Workflow Example**:

1. Branch initiates quality check on inbound shipment and finds damaged items
2. Quality check module auto-creates return shipment with status DRAFT
3. Warehouse user sees return in list, marks it PACKED
4. Branch operator picks up return (status → IN_TRANSIT)
5. Warehouse receives return, marks it RECEIVED
6. Return items are added to DC inventory with RETURN movement ledger entries

---

## Feature: Network Movement Ledger (`/warehouse/ledger`)

### Hooks

- **`useNetworkMovementLedger(filters)`** — `GET /api/movement-ledgers?context=store` (all stores) OR `?context=dc` (all DCs)
- **`useBranchMovementLedger(branchId)`** — `GET /api/movement-ledgers?context=store&contextId=<branchId>`
- **`useLocationFilter()`** — returns list of all stores and DCs for filtering

### UI

**Network Ledger View**

Filter bar:

- Location selector: "All Locations", "Store: X", "DC: Y" (combines stores and DCs)
- Movement type: IN, OUT, ADJUSTMENT, RETURN, All
- Date range: from/to pickers
- Product search (optional)

Table with columns:

- Date/Time, Location (Store or DC), Product Name, Movement Type badge, Qty, Reference (Shipment ID, Return ID, etc.), Reason/Note

Paginated. Sortable by Date/Time, Location, Product, Qty. Default sort: descending Date/Time.

Export-to-CSV button: downloads filtered data.

---

## Feature: Shipment Tracking Enhancement (`/warehouse/shipments`)

### Hooks

- **`useOutboundShipments(dcId, filters)`** — `GET /api/shipping?distributionCenterId=<dcId>` — shipments from selected DC
- **`useShipmentTrackingDetails(shipmentId)`** — `GET /api/shipping/:id` — detailed tracking info including status history

### UI

**Outbound Shipments List**

Table with columns:

- Shipment ID, Destination Store, Status badge, Ship Date, ETA, Items count, Track button

Filter bar: status, date range, destination store.

"Track" button → navigates to Shipment Tracking Detail page.

**Shipment Tracking Detail** (`/warehouse/shipments/:id`)

- Header: Shipment ID, Destination Store, Status, Ship Date, ETA, Current Location (if available from 3PL)
- **Status Timeline**: Visual timeline showing DRAFT → PACKED → IN_TRANSIT → DELIVERED
  - Each status shows timestamp and who performed the action
- **Items in Shipment**: Table with Product Name, Qty Shipped, Quality Check Status (if received)
- **Tracking Notes**: Any notes from branch receiving team or 3PL

---

## Shared Warehouse Components

### `LocationSelector`

Dropdown combining all stores and DCs for filtering:

```
All Locations
  ├── Stores
  │   ├── Makati Branch
  │   ├── BGC Branch
  │   └── Ortigas Branch
  └── Distribution Centers
      └── Central Warehouse
```

When changed, updates parent filters.

### `MovementTypeBadge`

Renders: IN (green), OUT (red), ADJUSTMENT (blue), RETURN (orange).

### `StatusTimeline`

Visual component showing progression of statuses with timestamps:

```
✓ DRAFT (2024-05-21 09:00)
  → ✓ PACKED (2024-05-21 10:30)
    → ✓ IN_TRANSIT (2024-05-21 11:00)
      → DELIVERED (pending)
```

---

## Query Invalidation Map (Warehouse-specific)

| Mutation                            | Invalidates                                |
| ----------------------------------- | ------------------------------------------ |
| `adjustDCInventory`                 | `['dc-inventory']`, `['movement-ledgers']` |
| `updateReturnStatus`                | `['returns']`, `['movement-ledgers']`      |
| `advanceShippingStatus (any stage)` | `['shipping']`, `['movement-ledgers']`     |

---

## Acceptance Criteria

- [ ] DC Inventory tab shows current stock with reserved/available breakdown
- [ ] Recording an inventory adjustment creates a movement ledger entry with reason
- [ ] Return shipment list shows all returns with correct status
- [ ] Advancing return status (Draft → Packed → In Transit → Received) works end-to-end
- [ ] Network Movement Ledger displays entries from all stores and DCs with location labels
- [ ] Filtering by location shows only entries for that location
- [ ] Export-to-CSV downloads all filtered movement ledger data
- [ ] Shipment tracking detail shows status timeline with timestamps
- [ ] All views handle loading, error, and empty states
- [ ] TypeScript compiles with zero errors across all new feature files

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
