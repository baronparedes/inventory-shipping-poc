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

Action: "View & Receive" button — opens a **Receive Shipment Modal** (see Quality Check Flow below).

### Quality Check Flow (Shipment Receiving)

When user clicks "View & Receive" on an inbound shipment:

1. **Shipment Summary Modal** opens with:
   - Header: Shipment ID, ETA, current status
   - Item list (initially all marked as "Pending Quality Check")

2. **Quality Check Phase**:
   - For each item in the shipment, user marks status as "PASS" or "FAILED"
   - If "FAILED", user selects a reason: "Expired", "Damaged", "Other"
   - Summary shows: X items passing, Y items failing
   - User can edit checks before confirming

3. **Submit Quality Checks**:
   - User clicks "Confirm Quality Checks"
   - Calls `useRecordQualityChecks()` — `POST /api/quality-checks` with all checks
   - Backend processes checks and creates return shipment if any items failed
   - On success: show toast with summary ("X items accepted, Y items marked for return")
   - Modal closes

4. **Complete Shipment Receipt**:
   - After quality checks are submitted, modal shows "Accepted items will be added to inventory"
   - User clicks "Complete Receipt"
   - Calls `useReceiveShipment()` — `PATCH /api/shipping/:id/status` with `{ status: 'DELIVERED' }`
   - On success: invalidate `['inventory', storeId]` and `['shipping']`
   - Show success toast: "Shipment received and added to inventory"

### Hooks

- **`useRecordQualityChecks()`** — `POST /api/quality-checks` mutation
- **`useReceiveShipment()`** — `PATCH /api/shipping/:id/status` mutation
- **`useCreateReturnShipment()`** — `POST /api/returns` mutation (called automatically by quality-checks module)

---

## Feature: New Customer Order (`/store/orders`)

### Hooks

- **`useProducts()`** — `GET /api/products` — for product search/select
- **`useSearchCustomers(searchTerm)`** — `GET /api/customers?search=<term>` — for returning customer lookup
- **`useCreateOrder()`** — `POST /api/orders` mutation
- **`useCreateCustomer()`** — `POST /api/customers` mutation

### UI

**Order Form** — Two-panel layout:

**Left panel — Order Header**:

- **Customer Search** (type-ahead):
  - Search returning customers by name, email, or phone
  - On selection, auto-populate all customer fields
  - "New Customer" option to clear and start fresh
- **Customer Name** (text input, required)
- **Optional Customer Details** (collapsible section):
  - Address (text input, optional)
  - Mobile Number (text input, optional)
  - Email (email input, optional)
  - Philhealth Number (text input, optional)
- **Order Reference** (text input, required)
- **Summary**: item count, total units

**Right panel — Order Items**:

- Product search: type-ahead dropdown filtering by name or SKU
- Selected product row: Product name, Qty stepper (increment/decrement, min 1), Remove button
- "Add Product" button
- Empty state if no items

**Bottom bar**:

- "Complete Order" primary button:
  - Disabled if: `customerName` or `orderRef` is empty, or `items` is empty
  - On click:
    - Calls `useCreateOrder` mutation with all order data (including optional customer fields)
    - Invalidates `['orders']` and `['inventory', storeId]`
  - On success: show success toast, clear the form
  - On error `INSUFFICIENT_STOCK`: show inline error identifying the product
  - On error: show general error message with retry

**Validation rules (client-side)**:

- `customerName`: required, non-empty
- `orderRef`: required, non-empty
- At least 1 item
- All item quantities: positive integers
- Optional fields: if provided, validate format (email format, phone format)

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

- **`useLowStockItems(storeId)`** — `GET /api/inventory/:storeId/low-stock` — for tab 1 defaults
- **`useAllProducts()`** — `GET /api/products` — for adding any medication
- **`useCreateReorderRequest()`** — `POST /api/reorder-requests` mutation
- **`useReorderHistory(storeId)`** — `GET /api/reorder-requests?storeId=<storeId>`

### UI

**Tab 1: Create Refill Request**

Form:

- **Priority Selector**: Low / Medium / High (required)
- **Request Builder**:
  - Show low-stock items by default in a table with: Product Name, On-Hand, Threshold, Suggested Qty (threshold - onHand)
  - User can edit Requested Qty for each item or toggle to include/exclude
  - "Add Any Medication" button to add medications regardless of stock level:
    - Opens a product selector (autocomplete, searchable)
    - User specifies quantity
    - Product added to the request table
- **Request Table** shows all items to order with:
  - Columns: Product Name, Qty Requested, Remove button
  - Checkboxes to include/exclude items
- "Submit Refill Request" primary button:
  - Disabled if no items selected or priority not chosen
  - On success: show toast, switch to Tab 2, invalidate `['reorder-requests']`

**Tab 2: Request History**

Table with columns:

- Request ID (truncated), Priority badge, Status badge, Items count, Date

Status badges: Pending (blue), Approved (amber), Fulfilled (green).

Row click → opens detail modal showing: priority, status, items list with product name and requested qty.

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
