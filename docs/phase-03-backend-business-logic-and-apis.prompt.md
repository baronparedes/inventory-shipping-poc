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
app.use("/api/inventory", authenticate, inventoryRouter);
app.use("/api/transactions", authenticate, transactionsRouter);
app.use("/api/orders", authenticate, ordersRouter);
app.use("/api/reorder-requests", authenticate, reorderRequestsRouter);
app.use("/api/shipping", authenticate, shippingRouter);
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
