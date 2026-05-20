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
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         Role
  storeId      String?
  store        Store?   @relation(fields: [storeId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role {
  STORE
  WAREHOUSE
}

model Store {
  id         String  @id @default(uuid())
  name       String
  city       String
  manager    String
  users      User[]
  inventory  StoreInventoryItem[]
  orders     CustomerOrder[]
  requests   ReorderRequest[]
  shipments  ShippingOrder[]
  transactions InventoryTransaction[]
}

model Product {
  id               String          @id @default(uuid())
  sku              String          @unique
  name             String
  category         ProductCategory
  reorderThreshold Int
  warehouseStock   Int             @default(0)
  inventoryItems   StoreInventoryItem[]
  transactions     InventoryTransaction[]
  orderItems       CustomerOrderItem[]
  requestItems     ReorderRequestItem[]
  shipmentItems    ShippingOrderItem[]
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
  store     Store   @relation(fields: [storeId], references: [id])
  product   Product @relation(fields: [productId], references: [id])

  @@unique([storeId, productId])
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
  store        Store        @relation(fields: [storeId], references: [id])
  product      Product      @relation(fields: [productId], references: [id])
}

enum MovementType {
  IN
  OUT
}

model CustomerOrder {
  id           String              @id @default(uuid())
  storeId      String
  customerName String
  orderRef     String
  servedAt     DateTime            @default(now())
  store        Store               @relation(fields: [storeId], references: [id])
  items        CustomerOrderItem[]
}

model CustomerOrderItem {
  id        String        @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  order     CustomerOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product       @relation(fields: [productId], references: [id])
}

model ReorderRequest {
  id        String               @id @default(uuid())
  storeId   String
  priority  Priority
  status    ReorderStatus        @default(DRAFT)
  createdAt DateTime             @default(now())
  store     Store                @relation(fields: [storeId], references: [id])
  items     ReorderRequestItem[]
  shipments ShippingOrder[]
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum ReorderStatus {
  DRAFT
  PENDING
  APPROVED
  FULFILLED
}

model ReorderRequestItem {
  id           String         @id @default(uuid())
  requestId    String
  productId    String
  requestedQty Int
  request      ReorderRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  product      Product        @relation(fields: [productId], references: [id])
}

model ShippingOrder {
  id        String             @id @default(uuid())
  requestId String
  storeId   String
  shipDate  DateTime
  eta       DateTime
  status    ShippingStatus     @default(DRAFT)
  request   ReorderRequest     @relation(fields: [requestId], references: [id])
  store     Store              @relation(fields: [storeId], references: [id])
  items     ShippingOrderItem[]
}

enum ShippingStatus {
  DRAFT
  PACKED
  IN_TRANSIT
  DELIVERED
}

model ShippingOrderItem {
  id        String        @id @default(uuid())
  shipmentId String
  productId String
  quantity  Int
  shipment  ShippingOrder @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  product   Product       @relation(fields: [productId], references: [id])
}
```

### Seed Script

Create `apps/api/prisma/seed.ts` that:

1. Creates 3 `Store` records (e.g. Makati Branch, BGC Branch, Ortigas Branch)
2. Creates 10 `Product` records across all categories with realistic SKUs and reorder thresholds
3. Creates `StoreInventoryItem` records for each store-product pair with varied `onHand` values
4. Creates one `WAREHOUSE` user and one `STORE` user per store (use `bcrypt` to hash passwords, default password `password123`)
5. Is idempotent — use `upsert` so it can be safely re-run

## Authentication

### JWT-based Auth

Implement `apps/api/src/modules/auth/`:

- **`auth.schema.ts`** — Zod schemas for `LoginRequestBody` (`email`, `password`)
- **`auth.service.ts`** — `login(email, password)`: find user by email, compare password with bcrypt, return signed JWT
- **`auth.router.ts`** — `POST /api/auth/login` route using the service
- **`auth.middleware.ts`** — `authenticate` middleware: extract Bearer token from `Authorization` header, verify with `jsonwebtoken`, attach decoded payload to `req.user`

JWT payload shape:

```ts
{ userId: string; email: string; role: 'STORE' | 'WAREHOUSE'; storeId?: string }
```

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
