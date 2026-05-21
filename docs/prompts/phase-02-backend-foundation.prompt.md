---
mode: agent
description: Phase 2 — Backend Foundation: Database, Auth, and API scaffolding
---

# Phase 2: Backend Foundation

## Context

The monorepo from Phase 1 is in place. You are now building the backend foundation for the **Pharmacy Inventory and Shipping** API in `apps/api`. The backend uses **Node.js + Express + TypeScript** with **PostgreSQL** via **Prisma ORM**.

## Goal

Set up the complete backend foundation: database schema, migrations, authentication middleware, error handling, request logging, and a health check endpoint. No business logic yet — this phase establishes the structural backbone.

## Database Schema (Prisma)

Create `apps/api/prisma/schema.prisma` with the following models. Use **UUIDs** as primary keys (`@default(uuid())`). Use `@map` and `@@map` to keep snake_case column names in the database while using camelCase in the Prisma client.

### Models

```prisma
model User {
  id                        String                     @id @default(uuid())
  email                     String                     @unique
  passwordHash              String
  role                      Role
  createdAt                 DateTime                   @default(now())
  updatedAt                 DateTime                   @updatedAt
  storeAccess               UserStoreAccess[]          # For STORE users with access to multiple stores
  distributionCenterAccess  UserDistributionCenterAccess[] # For WAREHOUSE users with access to multiple DCs
}

enum Role {
  STORE
  WAREHOUSE
  STAKEHOLDER
}

model UserStoreAccess {
  id      String @id @default(uuid())
  userId  String
  storeId String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  store   Store  @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([userId, storeId])
}

model UserDistributionCenterAccess {
  id                   String             @id @default(uuid())
  userId               String
  distributionCenterId String
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  distributionCenter   DistributionCenter @relation(fields: [distributionCenterId], references: [id], onDelete: Cascade)

  @@unique([userId, distributionCenterId])
}

model Store {
  id                String                 @id @default(uuid())
  name              String
  city              String
  manager           String
  createdAt         DateTime               @default(now())
  userAccess        UserStoreAccess[]
  inventory         StoreInventoryItem[]
  orders            CustomerOrder[]
  requests          ReorderRequest[]
  shipments         ShippingOrder[]
  transactions      InventoryTransaction[]
  movementLedger    MovementLedgerEntry[]  # Inbound and outbound entries for this store
  returnShipments   ReturnShipment[]       # Returns initiated from this store
}

model DistributionCenter {
  id                    String                      @id @default(uuid())
  name                  String
  city                  String
  manager               String
  createdAt             DateTime                    @default(now())
  userAccess            UserDistributionCenterAccess[]
  inventory             DistributionCenterInventoryItem[]
  outboundShipments     ShippingOrder[]             # Shipments dispatched from this DC
  returnShipments       ReturnShipment[]            # Return shipments received at this DC
  movementLedger        MovementLedgerEntry[]       # Movement entries for this DC
}

model Product {
  id               String                           @id @default(uuid())
  sku              String                           @unique
  name             String
  category         ProductCategory
  reorderThreshold Int
  createdAt        DateTime                         @default(now())
  inventoryItems   StoreInventoryItem[]
  dcInventoryItems DistributionCenterInventoryItem[]
  transactions     InventoryTransaction[]
  orderItems       CustomerOrderItem[]
  requestItems     ReorderRequestItem[]
  shipmentItems    ShippingOrderItem[]
  returnItems      ReturnShipmentItem[]
  movementEntries  MovementLedgerEntry[]
}

enum ProductCategory {
  OTC
  PRESCRIPTION
  COLD_CHAIN
  SUPPLIES
}

model StoreInventoryItem {
  id        String  @id @default(uuid())
  storeId   String
  productId String
  onHand    Int     @default(0)
  store     Store   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([storeId, productId])
}

model DistributionCenterInventoryItem {
  id                   String             @id @default(uuid())
  distributionCenterId String
  productId            String
  onHand               Int                @default(0)
  distributionCenter   DistributionCenter @relation(fields: [distributionCenterId], references: [id], onDelete: Cascade)
  product              Product            @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([distributionCenterId, productId])
}

model Customer {
  id              String          @id @default(uuid())
  name            String
  address         String?
  mobileNumber    String?
  email           String?
  philhealthNumber String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  orders          CustomerOrder[]
}

model InventoryTransaction {
  id           String       @id @default(uuid())
  storeId      String
  productId    String
  movementType MovementType
  quantity     Int
  occurredAt   DateTime     @default(now())
  reference    String
  note         String       @default("")
  store        Store        @relation(fields: [storeId], references: [id], onDelete: Cascade)
  product      Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
}

enum MovementType {
  IN          # Inbound shipment received
  OUT         # Customer order fulfilled
  ADJUSTMENT  # Adjustment (loss, damage, audit)
  RETURN      # Return shipment received
}

model MovementLedgerEntry {
  id                   String             @id @default(uuid())
  storeId              String?            # Null if this entry is for a DC
  distributionCenterId String?            # Null if this entry is for a store
  productId            String
  movementType         MovementType
  quantity             Int
  occurredAt           DateTime           @default(now())
  reference            String             # Shipment ID, Return ID, Adjustment ID, etc.
  reason               String?            # For adjustments: loss, damage, audit, etc.
  store                Store?             @relation(fields: [storeId], references: [id], onDelete: Cascade)
  distributionCenter   DistributionCenter? @relation(fields: [distributionCenterId], references: [id], onDelete: Cascade)
  product              Product            @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model CustomerOrder {
  id              String              @id @default(uuid())
  storeId         String
  customerId      String?             # Optional: link to persistent customer
  customerName    String              # Still required for the order
  orderRef        String
  customerAddress String?             # Optional customer fields
  customerMobile  String?
  customerEmail   String?
  servedAt        DateTime            @default(now())
  store           Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  customer        Customer?           @relation(fields: [customerId], references: [id], onDelete: SetNull)
  items           CustomerOrderItem[]
}

model CustomerOrderItem {
  id        String        @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  order     CustomerOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ReorderRequest {
  id        String               @id @default(uuid())
  storeId   String
  priority  Priority
  status    ReorderStatus        @default(PENDING)
  createdAt DateTime             @default(now())
  store     Store                @relation(fields: [storeId], references: [id], onDelete: Cascade)
  items     ReorderRequestItem[]
  shipments ShippingOrder[]
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum ReorderStatus {
  PENDING    # Awaiting warehouse approval
  APPROVED   # Approved, ready for dispatch
  FULFILLED  # Dispatch created or completed
}

model ReorderRequestItem {
  id           String         @id @default(uuid())
  requestId    String
  productId    String
  requestedQty Int
  request      ReorderRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  product      Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ShippingOrder {
  id                   String             @id @default(uuid())
  requestId            String?            # Null if this is a direct dispatch or return
  storeId              String             # Destination store
  distributionCenterId String             # Source DC
  shipDate             DateTime
  eta                  DateTime
  status               ShippingStatus     @default(DRAFT)
  createdAt            DateTime           @default(now())
  request              ReorderRequest?    @relation(fields: [requestId], references: [id], onDelete: SetNull)
  store                Store              @relation(fields: [storeId], references: [id], onDelete: Cascade)
  distributionCenter   DistributionCenter @relation(fields: [distributionCenterId], references: [id], onDelete: Cascade)
  items                ShippingOrderItem[]
  qualityChecks        QualityCheckRecord[]
  returnShipment       ReturnShipment?    # The return shipment associated with this inbound (if any)
}

enum ShippingStatus {
  DRAFT      # Being prepared
  PACKED     # Ready for dispatch
  IN_TRANSIT # In transit
  DELIVERED  # Received at destination
  RETURNED   # Returned to warehouse
}

model ShippingOrderItem {
  id           String        @id @default(uuid())
  shipmentId   String
  productId    String
  quantity     Int
  acceptedQty  Int?          # For quality checks: quantity accepted after inspection
  shipment     ShippingOrder @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  product      Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model QualityCheckRecord {
  id           String        @id @default(uuid())
  shipmentId   String
  productId    String
  quantity     Int
  status       QualityStatus # PASS or FAILED
  reason       String?       # If FAILED: expired, damaged, etc.
  checkedAt    DateTime      @default(now())
  checkedBy    String        # User ID of checker
  shipment     ShippingOrder @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  product      Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
}

enum QualityStatus {
  PASS
  FAILED
}

model ReturnShipment {
  id                   String             @id @default(uuid())
  originatingShipmentId String             # The inbound shipment that triggered the return
  storeId              String             # Store sending the return
  distributionCenterId String             # DC receiving the return
  reason               String             # Reason for return (quality issues, damage, etc.)
  status               ReturnStatus       @default(DRAFT)
  createdAt            DateTime           @default(now())
  originatingShipment  ShippingOrder      @relation(fields: [originatingShipmentId], references: [id], onDelete: Restrict)
  store                Store              @relation(fields: [storeId], references: [id], onDelete: Cascade)
  distributionCenter   DistributionCenter @relation(fields: [distributionCenterId], references: [id], onDelete: Cascade)
  items                ReturnShipmentItem[]
}

enum ReturnStatus {
  DRAFT      # Being prepared
  PACKED     # Ready for pickup
  IN_TRANSIT # In transit
  RECEIVED   # Received at DC
}

model ReturnShipmentItem {
  id          String        @id @default(uuid())
  returnId    String
  productId   String
  quantity    Int
  returnReason String        # Specific reason for this item (expired, damaged, etc.)
  returnShipment ReturnShipment @relation(fields: [returnId], references: [id], onDelete: Cascade)
  product     Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### Seed Script

Create `apps/api/prisma/seed.ts` that:

1. Creates 1 `DistributionCenter` record (e.g. Central Warehouse)
2. Creates 3 `Store` records (e.g. Makati Branch, BGC Branch, Ortigas Branch)
3. Creates 15 `Product` records across all categories with realistic SKUs and reorder thresholds
4. Creates `StoreInventoryItem` and `DistributionCenterInventoryItem` records with varied `onHand` values
5. Creates users with different access patterns:
   - One `WAREHOUSE` user with access to the DC
   - One `STORE` user with access to one branch
   - One `STORE` user with access to multiple branches (demonstrating multi-context)
   - One `STAKEHOLDER` user (no store or DC access)
6. Creates 5-10 `Customer` records with various details (some with all fields, some sparse)
7. Uses `bcrypt` to hash passwords (default password `password123`)
8. Is idempotent — use `upsert` or check existence so it can be safely re-run

## Authentication

### JWT-based Auth

Implement `apps/api/src/modules/auth/`:

- **`auth.schema.ts`** — Zod schemas for `LoginRequestBody` (`email`, `password`)
- **`auth.service.ts`** — `login(email, password)`: find user by email, compare password with bcrypt, return signed JWT
- **`auth.router.ts`** — `POST /api/auth/login` route using the service
- **`auth.middleware.ts`** — `authenticate` middleware: extract Bearer token from `Authorization` header, verify with `jsonwebtoken`, attach decoded payload to `req.user`

JWT payload shape:

```ts
{
  userId: string;
  email: string;
  role: 'STORE' | 'WAREHOUSE' | 'STAKEHOLDER';
  selectedContextId?: string; // Currently selected store or DC ID
}
```

**For STORE role**: `selectedContextId` is the selected `storeId`  
**For WAREHOUSE role**: `selectedContextId` is the selected `distributionCenterId`  
**For STAKEHOLDER role**: `selectedContextId` is optional (not used)

### Role Guard

- `requireRole(...roles: Role[])` middleware factory — returns 403 if `req.user.role` is not in the allowed list

## Middleware Stack

Configure in `apps/api/src/index.ts` in this order:

1. `helmet()` — security headers
2. `cors({ origin: process.env.CORS_ORIGIN })` — CORS with explicit origin
3. `express.json({ limit: '1mb' })` — body parsing with size limit
4. `morgan('combined')` (or a custom logger) — request logging
5. Routes mounted at `/api`
6. **Global error handler** — catches all errors, returns structured JSON:

   ```json
   {"error": {"code": "INTERNAL_ERROR", "message": "..."}}
   ```

   - Map `ZodError` → 400 with field-level validation details
   - Map custom `AppError` class → use its status code and error code
   - All other errors → 500

## Health Check

`GET /api/health` — returns:

```json
{"status": "ok", "timestamp": "ISO8601", "version": "0.0.1"}
```

No auth required.

## Environment Validation

In `apps/api/src/config/env.ts`, validate all env vars at startup using Zod:

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1d"),
  CORS_ORIGIN: z.string().url(),
});
```

Export a validated `env` object — never use `process.env` directly outside this file.

## Acceptance Criteria

- [ ] `pnpm --filter api db:migrate` applies all Prisma migrations cleanly
- [ ] `pnpm --filter api db:seed` seeds the database without errors
- [ ] `POST /api/auth/login` returns a valid JWT for correct credentials
- [ ] `POST /api/auth/login` returns 401 for wrong credentials
- [ ] `authenticate` middleware returns 401 for missing/invalid tokens
- [ ] `requireRole` returns 403 for users without the required role
- [ ] `GET /api/health` returns 200 without a token
- [ ] Invalid request bodies return 400 with Zod field-level errors
- [ ] Server fails fast at startup if required env vars are missing
