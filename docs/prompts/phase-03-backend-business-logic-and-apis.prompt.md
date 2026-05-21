---
mode: agent
description: Phase 3 — Backend Business Logic & API Endpoints
---

# Phase 3: Backend Business Logic & API Endpoints

## Context

The backend foundation from Phase 2 is complete: Prisma schema, migrations, auth middleware, and error handling are in place. This phase implements all domain-specific API endpoints and their business logic across every module.

All routes are prefixed with `/api`. All non-health routes require the `authenticate` middleware. Role-based restrictions are enforced per route using `requireRole`.

## Module Structure Pattern

Each module follows this structure:

```
src/modules/<module>/
├── <module>.schema.ts    # Zod request/response schemas
├── <module>.service.ts   # Business logic, Prisma calls
├── <module>.router.ts    # Express router with middleware
└── <module>.types.ts     # (optional) module-specific types
```

---

## 1. Products Module

**File**: `src/modules/products/`  
**Access**: Both roles

### Endpoints

| Method  | Path                                | Description                             |
| ------- | ----------------------------------- | --------------------------------------- |
| `GET`   | `/api/products`                     | List all products                       |
| `GET`   | `/api/products/:id`                 | Get single product                      |
| `POST`  | `/api/products`                     | Create product (WAREHOUSE only)         |
| `PATCH` | `/api/products/:id`                 | Update product (WAREHOUSE only)         |
| `PATCH` | `/api/products/:id/warehouse-stock` | Adjust warehouse stock (WAREHOUSE only) |

### Validation (Zod)

- `name`: non-empty string
- `sku`: non-empty, unique string
- `category`: enum `OTC | PRESCRIPTION | COLD_CHAIN | SUPPLIES`
- `reorderThreshold`: positive integer
- `warehouseStock`: non-negative integer

---

## 2. Stores Module

**File**: `src/modules/stores/`  
**Access**: Both roles

### Endpoints

| Method | Path              | Description      |
| ------ | ----------------- | ---------------- |
| `GET`  | `/api/stores`     | List all stores  |
| `GET`  | `/api/stores/:id` | Get single store |

---

## 3. Inventory Module

**File**: `src/modules/inventory/`  
**Access**: Both roles

### Endpoints

| Method | Path                                | Description                                                                         |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`  | `/api/inventory`                    | List all inventory items (WAREHOUSE sees all stores; STORE sees own `storeId` only) |
| `GET`  | `/api/inventory/:storeId`           | Get inventory for a specific store (scoped by role)                                 |
| `GET`  | `/api/inventory/:storeId/low-stock` | Get items where `onHand <= product.reorderThreshold`                                |
| `GET`  | `/api/transactions`                 | List inventory transactions (WAREHOUSE sees all; STORE scoped to own store)         |
| `GET`  | `/api/transactions/:storeId`        | List transactions for a specific store                                              |

### Business Rules

- STORE users can only access inventory and transactions for their own `storeId`
- Return product details (name, sku, category, reorderThreshold) joined with each inventory item
- Transactions must be returned in descending `occurredAt` order

---

## 4. Customer Orders Module

**File**: `src/modules/orders/`  
**Access**: STORE only

### Endpoints

| Method | Path              | Description                             |
| ------ | ----------------- | --------------------------------------- |
| `GET`  | `/api/orders`     | List orders for the authenticated store |
| `GET`  | `/api/orders/:id` | Get order details with items            |
| `POST` | `/api/orders`     | Create and serve a customer order       |

### `POST /api/orders` — Serve Customer Order

**Request body**:

```ts
{
  customerName: string; // required, non-empty
  orderRef: string; // required, non-empty
  items: Array<{
    productId: string;
    quantity: number; // positive integer
  }>;
}
```

**Business logic (atomic Prisma transaction)**:

1. Validate all `productId` values exist
2. For each item, load `StoreInventoryItem` where `storeId = req.user.storeId`
3. If any item has `onHand < quantity`, throw `AppError(400, 'INSUFFICIENT_STOCK', 'Insufficient stock for product: <name>')`
4. Deduct quantities from `StoreInventoryItem.onHand`
5. Create `CustomerOrder` record with items
6. Write `InventoryTransaction` records for each item:
   - `movementType: OUT`
   - `reference: order.id`
   - `note: 'Customer order: <orderRef>'`
7. Return the created order with items

---

## 5. Reorder Requests Module

**File**: `src/modules/reorder-requests/`  
**Access**: STORE (create/view own); WAREHOUSE (view all, update status)

### Endpoints

| Method  | Path                               | Description                                  |
| ------- | ---------------------------------- | -------------------------------------------- |
| `GET`   | `/api/reorder-requests`            | WAREHOUSE: all requests; STORE: own requests |
| `GET`   | `/api/reorder-requests/:id`        | Get request details with items               |
| `POST`  | `/api/reorder-requests`            | STORE only — create draft reorder request    |
| `PATCH` | `/api/reorder-requests/:id/status` | WAREHOUSE only — update status               |

### `POST /api/reorder-requests` — Create Reorder Request

**Request body**:

```ts
{
  priority: "LOW" | "MEDIUM" | "HIGH";
  items: Array<{
    productId: string;
    requestedQty: number; // positive integer
  }>;
}
```

**Business logic**:

1. Validate items are non-empty
2. Validate all `productId` values exist
3. Create `ReorderRequest` with status `PENDING` (auto-submitted, no draft flow from API)
4. Return created request with items

### `PATCH /api/reorder-requests/:id/status` — Update Status

**Request body**: `{ status: 'APPROVED' | 'FULFILLED' }`

**Business rules**:

- Only WAREHOUSE can call this
- Valid transitions: `PENDING → APPROVED`, `APPROVED → FULFILLED`
- Reject invalid transitions with `400 INVALID_STATUS_TRANSITION`

---

## 6. Shipping Orders Module

**File**: `src/modules/shipping/`  
**Access**: WAREHOUSE (create/update status); STORE (view inbound, receive)

### Endpoints

| Method  | Path                       | Description                                                 |
| ------- | -------------------------- | ----------------------------------------------------------- |
| `GET`   | `/api/shipping`            | WAREHOUSE: all shipments; STORE: own inbound shipments      |
| `GET`   | `/api/shipping/:id`        | Get shipment details with items                             |
| `POST`  | `/api/shipping`            | WAREHOUSE only — create shipping order from reorder request |
| `PATCH` | `/api/shipping/:id/status` | Advance shipping status                                     |

### `POST /api/shipping` — Create Shipping Order

**Request body**:

```ts
{
  requestId: string;
  shipDate: string; // ISO8601 date
  eta: string; // ISO8601 date
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
```

**Business logic**:

1. Validate `requestId` exists and is in `APPROVED` status
2. Validate no existing shipment already exists for this `requestId`
3. Create `ShippingOrder` with status `DRAFT`
4. Update `ReorderRequest.status` to `FULFILLED`
5. Return created shipment with items

### `PATCH /api/shipping/:id/status` — Advance Status

**Request body**: `{ status: 'PACKED' | 'IN_TRANSIT' | 'DELIVERED' }`

**Business logic**:

Allowed transitions:

- `DRAFT → PACKED` (WAREHOUSE only)
- `PACKED → IN_TRANSIT` (WAREHOUSE only)
- `IN_TRANSIT → DELIVERED` — **this is the receive shipment action** (STORE only)

When `IN_TRANSIT → DELIVERED` (STORE receives shipment):

1. Load shipment items
2. For each item, increment `StoreInventoryItem.onHand` for `shipment.storeId`
3. Write `InventoryTransaction` records for each item:
   - `movementType: IN`
   - `reference: shipment.id`
   - `note: 'Received shipment'`
4. Set `ShippingOrder.status = DELIVERED`
5. All steps in a single Prisma transaction

**Error handling**: Reject invalid transitions with `400 INVALID_STATUS_TRANSITION`

---

## 7. Customers Module

**File**: `src/modules/customers/`  
**Access**: STORE only

### Endpoints

| Method | Path                 | Description                           |
| ------ | -------------------- | ------------------------------------- |
| `GET`  | `/api/customers`     | Search/list returning customers       |
| `GET`  | `/api/customers/:id` | Get customer details                  |
| `POST` | `/api/customers`     | Create new customer (from order form) |

### `GET /api/customers` — Search Customers

**Query parameters**:

- `search`: optional string to search by name, email, or phone
- `page`, `limit`: pagination

**Business logic**:

- STORE users can only search for customers within the context of their own branch (implicitly, no filtering needed per current spec)
- Return customers with all details populated

---

## 8. Quality Checks Module

**File**: `src/modules/quality-checks/`  
**Access**: STORE only

### Endpoints

| Method | Path                  | Description                          |
| ------ | --------------------- | ------------------------------------ |
| `POST` | `/api/quality-checks` | Record quality checks for a shipment |

### `POST /api/quality-checks` — Record Quality Checks

**Request body**:

```ts
{
  shipmentId: string;
  checks: Array<{
    productId: string;
    quantity: number; // total received quantity
    status: "PASS" | "FAILED"; // overall status for this product
    reason?: string; // if FAILED: expired, damaged, etc.
  }>;
}
```

**Business logic**:

1. Validate shipment exists and belongs to authenticated STORE user
2. Validate shipment is in `IN_TRANSIT` status (quality check happens before delivery confirmation)
3. For each check, create or update `QualityCheckRecord`
4. Calculate accepted quantities based on checks (those with status PASS)
5. If any items failed, trigger return shipment creation (see Returns Module)
6. Return success with summary of accepted vs. rejected items

---

## 9. Returns Module

**File**: `src/modules/returns/`  
**Access**: STORE (create); WAREHOUSE (update status, view all); both roles can view their own

### Endpoints

| Method  | Path                      | Description                                  |
| ------- | ------------------------- | -------------------------------------------- |
| `GET`   | `/api/returns`            | List returns (WAREHOUSE sees all; STORE own) |
| `GET`   | `/api/returns/:id`        | Get return shipment details                  |
| `POST`  | `/api/returns`            | Create return shipment (auto from QC issues) |
| `PATCH` | `/api/returns/:id/status` | WAREHOUSE only — update status               |

### `POST /api/returns` — Create Return Shipment

**Request body** (sent from quality-checks module or manual returns):

```ts
{
  originatingShipmentId: string;
  reason: string; // "Expired medications", "Damaged packaging", etc.
  items: Array<{
    productId: string;
    quantity: number;
    returnReason: string; // "Expired", "Damaged", etc.
  }>;
}
```

**Business logic**:

1. Validate `originatingShipmentId` exists and is associated with the authenticated STORE
2. Create `ReturnShipment` with status `DRAFT`
3. Create `ReturnShipmentItem` records for each item
4. Do NOT deduct inventory yet (inventory still belongs to store until receipt at DC)
5. Return created return shipment

### `PATCH /api/returns/:id/status` — Update Return Status

**Request body**: `{ status: 'PACKED' | 'IN_TRANSIT' | 'RECEIVED' }`

**Business logic**:

Allowed transitions (WAREHOUSE only):

- `DRAFT → PACKED`
- `PACKED → IN_TRANSIT`
- `IN_TRANSIT → RECEIVED`

When `IN_TRANSIT → RECEIVED` (DC receives return):

1. Load return items
2. For each item, increment `DistributionCenterInventoryItem.onHand`
3. Write `MovementLedgerEntry` records for each item:
   - `movementType: RETURN`
   - `reference: return.id`
   - `reason: 'Received return shipment'`
4. Set `ReturnShipment.status = RECEIVED`
5. Update original shipment status to `RETURNED`
6. All steps in a single Prisma transaction

---

## 10. Distribution Centers Module

**File**: `src/modules/distribution-centers/`  
**Access**: WAREHOUSE only for details; public for list (with limited info)

### Endpoints

| Method | Path                            | Description                          |
| ------ | ------------------------------- | ------------------------------------ |
| `GET`  | `/api/distribution-centers`     | List all distribution centers        |
| `GET`  | `/api/distribution-centers/:id` | Get DC details and inventory summary |

### Business Rules

- WAREHOUSE users can access full details
- STORE/STAKEHOLDER users can see list but not detailed inventory

---

## 11. Movement Ledgers Module

**File**: `src/modules/movement-ledgers/`  
**Access**: WAREHOUSE (all entries); STORE (own store entries only)

### Endpoints

| Method | Path                                                      | Description                            |
| ------ | --------------------------------------------------------- | -------------------------------------- |
| `GET`  | `/api/movement-ledgers`                                   | List movement entries (scoped by role) |
| `GET`  | `/api/movement-ledgers?context=store&contextId=<storeId>` | Filter by store                        |
| `GET`  | `/api/movement-ledgers?context=dc&contextId=<dcId>`       | Filter by DC                           |

### Query Parameters

- `context`: "store" or "dc" (required)
- `contextId`: store or DC ID (required)
- `movementType`: "IN" | "OUT" | "ADJUSTMENT" | "RETURN" (optional filter)
- `productId`: filter by product (optional)
- `dateFrom`, `dateTo`: filter by date range (optional)
- `page`, `limit`: pagination

**Business logic**:

- Return `MovementLedgerEntry` records with product and context details
- Sort by `occurredAt` descending
- STORE users can only view entries for their own store(s)
- WAREHOUSE users can view all entries

---

## 12. Dashboards Module (Stakeholder Reporting)

**File**: `src/modules/dashboards/`  
**Access**: STAKEHOLDER only

### Endpoints

| Method | Path                                 | Description                        |
| ------ | ------------------------------------ | ---------------------------------- |
| `GET`  | `/api/dashboards/executive-summary`  | Executive metrics and KPIs         |
| `GET`  | `/api/dashboards/inventory-aging`    | Inventory aging report by product  |
| `GET`  | `/api/dashboards/branch-performance` | Performance metrics per branch     |
| `GET`  | `/api/dashboards/dc-performance`     | Performance metrics per DC         |
| `GET`  | `/api/dashboards/product-movement`   | Product movement and demand trends |

### Query Parameters (for all endpoints)

- `dateFrom`, `dateTo`: report period (required or use sensible defaults like last 30 days)
- `branchId`, `dcId`: optional filters for specific branches or DCs

### Response Shapes (Stubs for now)

Each endpoint returns a JSON object with relevant metrics. Examples:

**Executive Summary**:

```ts
{
  totalNetworkInventoryValue: number;
  stockoutRate: number; // percentage
  onTimeShipmentRate: number;
  averageFulfillmentLeadTime: number; // days
  topFastMovingProducts: Array<{productId; name; units}>;
  topSlowMovingProducts: Array<{productId; name; units}>;
  totalOrdersServed: number;
  totalRefillsRequested: number;
}
```

**Inventory Aging**:

```ts
{
  byProduct: Array<{
    productId: string;
    name: string;
    branches: Array<{ branchId, name, agingBuckets: { '0-30d': qty, '31-60d': qty, ...  } }>;
    warehouse: { agingBuckets: { ... } };
  }>;
}
```

---

## Cross-Cutting Requirements

### Pagination

All list endpoints must support optional query parameters:

- `page` (default: 1)
- `limit` (default: 20, max: 100)

Return paginated responses in this shape:

```ts
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

### Input Validation

All request bodies must be validated with Zod schemas before reaching the service layer. Use a reusable `validate(schema)` middleware factory:

```ts
const validate = (schema: ZodSchema) => (req, res, next) => { ... }
```

### AppError Class

```ts
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
```

### Route Registration

Register all modules in `src/index.ts`:

```ts
app.use("/api/auth", authRouter);
app.use("/api/products", authenticate, productsRouter);
app.use("/api/stores", authenticate, storesRouter);
app.use("/api/distribution-centers", authenticate, distributionCentersRouter);
app.use("/api/inventory", authenticate, inventoryRouter);
app.use("/api/transactions", authenticate, transactionsRouter);
app.use("/api/orders", authenticate, ordersRouter);
app.use("/api/customers", authenticate, customersRouter);
app.use("/api/reorder-requests", authenticate, reorderRequestsRouter);
app.use("/api/shipping", authenticate, shippingRouter);
app.use("/api/quality-checks", authenticate, qualityChecksRouter);
app.use("/api/returns", authenticate, returnsRouter);
app.use("/api/movement-ledgers", authenticate, movementLedgersRouter);
app.use("/api/dashboards", authenticate, dashboardsRouter);
```

## Acceptance Criteria

- [ ] All endpoints return correct HTTP status codes (200, 201, 400, 401, 403, 404, 409)
- [ ] STORE users cannot access other stores' data — all endpoints are scoped by `req.user.storeId`
- [ ] Serving a customer order with insufficient stock returns 400 INSUFFICIENT_STOCK
- [ ] Serving a customer order deducts inventory and writes OUT transaction records
- [ ] Receiving a shipment increments inventory and writes IN transaction records
- [ ] All inventory changes are atomic (single Prisma transaction)
- [ ] Invalid status transitions are rejected with 400 INVALID_STATUS_TRANSITION
- [ ] All list endpoints support pagination and return `meta` object
- [ ] All request bodies are validated with Zod before reaching service layer
- [ ] No `process.env` used outside `src/config/env.ts`
