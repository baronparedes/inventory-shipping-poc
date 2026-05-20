---
mode: agent
description: Phase 7 — Testing Strategy: Unit, Integration, and End-to-End tests
---

# Phase 7: Testing Strategy

## Context

The full application stack is working end-to-end from Phase 6. This phase adds a comprehensive test suite covering the backend service layer, API integration, and critical frontend user flows. All tests must pass in CI before any deployment.

---

## Testing Stack

| Layer                           | Tool                                             |
| ------------------------------- | ------------------------------------------------ |
| Backend unit tests              | Vitest                                           |
| Backend integration (API) tests | Vitest + Supertest                               |
| Frontend unit tests             | Vitest + React Testing Library                   |
| Frontend component tests        | Vitest + React Testing Library + MSW             |
| End-to-end tests                | Playwright                                       |
| API mocking (frontend)          | MSW (Mock Service Worker)                        |
| Test database                   | PostgreSQL (dedicated `inventory_test` database) |

---

## Backend Tests (`apps/api`)

### Configuration

- Create `apps/api/vitest.config.ts` with:
  - `environment: 'node'`
  - `globalSetup: './src/test/setup.ts'` — runs migrations on `DATABASE_URL_TEST`
  - `setupFiles: ['./src/test/beforeEach.ts']` — truncates all tables before each test
- Add `DATABASE_URL_TEST` to `.env.example`

### Test Database Setup (`src/test/setup.ts`)

```ts
// Before all tests: run prisma migrate deploy against test DB
// After all tests: disconnect prisma client
```

### Before Each (`src/test/beforeEach.ts`)

Truncate all tables in dependency order to ensure test isolation:

```ts
await prisma.$executeRaw`TRUNCATE TABLE ... RESTART IDENTITY CASCADE`;
```

### Test Helpers (`src/test/helpers.ts`)

Create helper factories:

```ts
// Create a test user and return a signed JWT
createTestUser(role: 'STORE' | 'WAREHOUSE', storeId?: string): Promise<{ user, token }>

// Create a store
createTestStore(overrides?): Promise<Store>

// Create a product
createTestProduct(overrides?): Promise<Product>

// Create an inventory item
createTestInventoryItem(storeId, productId, onHand): Promise<StoreInventoryItem>
```

---

### Unit Tests — Service Layer

**`src/modules/orders/orders.service.test.ts`**

Test `serveCustomerOrder`:

- [ ] Creates order and returns it with items
- [ ] Deducts correct quantities from inventory
- [ ] Writes OUT transaction records for each item
- [ ] Throws `AppError(400, 'INSUFFICIENT_STOCK')` when `onHand < quantity`
- [ ] All operations are atomic — a partial failure rolls back all changes

**`src/modules/shipping/shipping.service.test.ts`**

Test `receiveShipment` (the DELIVERED transition):

- [ ] Increments inventory for each shipment item
- [ ] Writes IN transaction records
- [ ] Sets shipment status to DELIVERED
- [ ] Throws on duplicate receive attempt (already DELIVERED)

Test `createShippingOrder`:

- [ ] Creates shipment from an APPROVED request
- [ ] Sets request status to FULFILLED
- [ ] Throws when request is not APPROVED
- [ ] Throws when a shipment already exists for the request

Test status transition validation:

- [ ] Rejects `DELIVERED → PACKED` as invalid
- [ ] Rejects `DRAFT → IN_TRANSIT` (skipping PACKED)

**`src/modules/reorder-requests/reorder-requests.service.test.ts`**

Test status transitions:

- [ ] `PENDING → APPROVED` succeeds
- [ ] `APPROVED → FULFILLED` succeeds
- [ ] `PENDING → FULFILLED` is rejected as invalid transition

---

### Integration Tests — API Endpoints

Use `supertest` to test the full HTTP stack (auth middleware, validation, routing, service).

**`src/modules/auth/auth.router.test.ts`**

- [ ] `POST /api/auth/login` returns 200 + JWT for valid credentials
- [ ] `POST /api/auth/login` returns 401 for wrong password
- [ ] `POST /api/auth/login` returns 400 with Zod errors for missing fields
- [ ] Protected route returns 401 without token
- [ ] Protected route returns 401 with expired token

**`src/modules/orders/orders.router.test.ts`**

- [ ] `POST /api/orders` returns 201 and creates order with correct items
- [ ] `POST /api/orders` returns 400 INSUFFICIENT_STOCK for over-quantity request
- [ ] WAREHOUSE token on a STORE-only route returns 403
- [ ] `GET /api/orders` returns only the authenticated store's orders

**`src/modules/shipping/shipping.router.test.ts`**

- [ ] `POST /api/shipping` creates a dispatch from an APPROVED request
- [ ] `PATCH /api/shipping/:id/status` WAREHOUSE advances DRAFT → PACKED
- [ ] `PATCH /api/shipping/:id/status` STORE marks IN_TRANSIT → DELIVERED and updates inventory
- [ ] `PATCH /api/shipping/:id/status` rejects invalid transitions with 400

---

## Frontend Tests (`apps/web`)

### Configuration

- Create `apps/web/vitest.config.ts` with:
  - `environment: 'jsdom'`
  - `setupFiles: ['./src/test/setup.ts']`
- `src/test/setup.ts`:
  ```ts
  import "@testing-library/jest-dom";
  import {server} from "./mocks/server";
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  ```

### MSW Handlers (`src/test/mocks/`)

Create MSW handlers for all API endpoints used in tests. Structure:

```
src/test/mocks/
├── server.ts        # MSW server setup (Node environment)
├── browser.ts       # MSW browser setup (for dev mode, optional)
├── handlers/
│   ├── auth.ts
│   ├── inventory.ts
│   ├── orders.ts
│   ├── shipping.ts
│   └── reorder-requests.ts
```

Use realistic mock data that mirrors the backend response shape (paginated `{ data, meta }` where applicable).

---

### Component Tests

**`src/routes/LoginPage.test.tsx`**

- [ ] Renders email and password inputs
- [ ] Submit button is disabled when fields are empty
- [ ] Shows loading state while mutation is pending
- [ ] On success: navigates to `/store` for STORE user
- [ ] On success: navigates to `/warehouse` for WAREHOUSE user
- [ ] On 401 error: shows inline error message

**`src/features/store/StoreInventory.test.tsx`**

- [ ] Renders inventory table with product rows
- [ ] Highlights rows with `onHand <= threshold` in amber
- [ ] "View & Receive" opens the receive modal with shipment items
- [ ] Clicking "Confirm Receipt" calls the PATCH endpoint and shows success toast

**`src/features/store/StoreCustomerOrders.test.tsx`**

- [ ] "Complete Order" is disabled when customer name is empty
- [ ] "Complete Order" is disabled when items list is empty
- [ ] On `INSUFFICIENT_STOCK` error: shows inline error on the form
- [ ] On success: form is cleared and success toast shown

**`src/features/warehouse/WarehouseShipping.test.tsx`**

- [ ] Refill requests table shows all requests with correct status badges
- [ ] "Approve" button calls PATCH with status APPROVED
- [ ] "Create Dispatch" button opens the modal with pre-populated items
- [ ] Submitting dispatch creates a shipment and closes the modal

---

## End-to-End Tests (Playwright)

### Configuration

- Create `playwright.config.ts` at monorepo root:
  - `baseURL: 'http://localhost:5173'`
  - Browsers: `chromium` only for CI, all browsers for local
  - `webServer`: start both `apps/api` and `apps/web` before tests

### Test Files (`e2e/`)

**`e2e/auth.spec.ts`**

- [ ] Navigate to `/` → redirected to `/login`
- [ ] Login with STORE credentials → land on `/store`
- [ ] Login with WAREHOUSE credentials → land on `/warehouse`
- [ ] Login with wrong password → error message shown
- [ ] Click logout → redirected to `/login`

**`e2e/store-order-flow.spec.ts`**

Full happy-path test:

1. Login as STORE user
2. Navigate to `/store/inventory` → confirm stock table is visible
3. Navigate to `/store/orders`
4. Fill in customer name and order reference
5. Add a product with qty 1
6. Click "Complete Order"
7. Confirm success toast
8. Navigate to `/store/orders/history` → confirm new order appears

**`e2e/warehouse-dispatch-flow.spec.ts`**

Full happy-path test:

1. (Setup) Seed an APPROVED reorder request via API
2. Login as WAREHOUSE user
3. Navigate to `/warehouse/shipping`
4. Go to Refill Requests tab → find the APPROVED request
5. Click "Create Dispatch" → fill ship date, ETA
6. Submit → confirm dispatch appears in Active Dispatches tab
7. Click "Mark Packed" → confirm status updates
8. Click "Mark In Transit" → confirm status updates

**`e2e/inventory-receive.spec.ts`**

1. (Setup) Seed an IN_TRANSIT shipment via API
2. Login as STORE user
3. Navigate to `/store/inventory` → Inbound Shipments tab
4. Click "View & Receive"
5. Confirm modal shows correct items
6. Click "Confirm Receipt"
7. Confirm shipment disappears from inbound list
8. Navigate to On-Hand tab → confirm quantities increased

---

## CI Integration

Add to Turborepo pipeline:

```json
"test:unit": { "outputs": ["coverage/**"] },
"test:integration": { "outputs": [] },
"test:e2e": { "outputs": ["playwright-report/**"] }
```

Add GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: inventory_test
    steps:
      - checkout
      - setup pnpm
      - install dependencies
      - run migrations (test db)
      - run unit + integration tests
      - run Playwright e2e tests
      - upload playwright report as artifact
```

---

## Acceptance Criteria

- [ ] All backend unit tests pass with zero failures
- [ ] All API integration tests pass against the test database
- [ ] All React component tests pass with MSW mocking the API
- [ ] All Playwright e2e flows complete successfully against the running app
- [ ] Test coverage for backend service layer is ≥ 80%
- [ ] No tests rely on shared mutable state — each test is isolated
- [ ] `pnpm test` runs the full suite and exits 0 on success
