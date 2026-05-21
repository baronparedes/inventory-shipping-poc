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

**`src/modules/quality-checks/quality-checks.service.test.ts`**

Test `recordQualityChecks`:

- [ ] Creates QualityCheckRecord for each check
- [ ] If any items fail, auto-creates ReturnShipment with status DRAFT
- [ ] Returns summary of passed/failed items
- [ ] Throws when shipment is not IN_TRANSIT status

**`src/modules/returns/returns.service.test.ts`**

Test `createReturnShipment`:

- [ ] Creates return with provided items
- [ ] Sets status to DRAFT
- [ ] Does not modify inventory (inventory still at store)

Test `updateReturnStatus` (DRAFT → PACKED → IN_TRANSIT → RECEIVED):

- [ ] Valid transitions succeed
- [ ] Invalid transitions throw INVALID_STATUS_TRANSITION
- [ ] When IN_TRANSIT → RECEIVED: increments DC inventory, writes RETURN movement ledger entries

**`src/modules/customers/customers.service.test.ts`**

Test `createOrUpdateCustomer`:

- [ ] Creates new customer with all fields
- [ ] Updates existing customer when email/phone matches
- [ ] Handles optional fields gracefully

**`src/modules/movement-ledgers/movement-ledgers.service.test.ts`**

Test `createMovementEntry`:

- [ ] Creates entry with correct movement type (IN/OUT/ADJUSTMENT/RETURN)
- [ ] Associates with correct context (store or DC)
- [ ] Stores reference ID and reason

Test `listMovementEntries`:

- [ ] Filters by context type and ID
- [ ] Filters by movement type
- [ ] Filters by date range
- [ ] Paginates results
- [ ] Returns entries in descending occurredAt order

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

**`src/features/store/StoreInventory.test.tsx` (Quality Checks)**

- [ ] "View & Receive" opens the shipment modal
- [ ] User can mark items as PASS or FAILED
- [ ] If FAILED, reason dropdown appears
- [ ] "Confirm Quality Checks" submits checks and shows summary
- [ ] On success, modal progresses to receipt confirmation
- [ ] "Complete Receipt" marks shipment as DELIVERED

**`src/features/warehouse/WarehouseReturns.test.tsx`** (new)

- [ ] Returns list shows all returns with correct status badges
- [ ] "Mark Packed" button transitions status for DRAFT returns
- [ ] "Mark In Transit" button transitions status for PACKED returns
- [ ] "Mark Received" button transitions status for IN_TRANSIT returns
- [ ] Row click opens detail modal with items

**`src/features/store/StoreCustomerOrders.test.tsx` (Customer Persistence)**

- [ ] Customer search shows returning customers
- [ ] Clicking a customer auto-fills all fields
- [ ] Optional customer fields are populated if selected customer has them
- [ ] "New Customer" option clears fields
- [ ] On successful order, optional fields are sent to backend

**`src/features/warehouse/WarehouseMovementLedger.test.tsx`** (new)

- [ ] Movement ledger table displays entries with location and movement type
- [ ] Filter by location works (store or DC)
- [ ] Filter by movement type shows correct entries
- [ ] Export-to-CSV downloads the data
- [ ] Pagination works

**`src/routes/LoginPage.test.tsx` (Multi-Context)**

- [ ] Login with user having multiple stores shows context selector
- [ ] Selecting a store stores it and navigates to `/store`
- [ ] Login with single context auto-selects and navigates

**`src/features/stakeholder/ExecutiveDashboard.test.tsx`** (new)

- [ ] Dashboard loads and displays executive summary metrics
- [ ] Date range filter updates all metrics
- [ ] Top products list shows fast and slow movers
- [ ] Links to detail reports work

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
5. Confirm modal shows correct items with quality check options
6. Mark some items as PASS, some as FAILED with reasons
7. Click "Confirm Quality Checks" → confirm return is created for failed items
8. Click "Complete Receipt"
9. Confirm shipment disappears from inbound list
10. Navigate to On-Hand tab → confirm quantities increased (only passed items)

**`e2e/customer-persistence.spec.ts`** (new)

1. Login as STORE user
2. Navigate to `/store/orders`
3. Search for and select a returning customer
4. Confirm all customer details are auto-filled
5. Add items and complete order
6. Navigate to create a new order
7. Search for the same customer again → confirm details populated
8. Optionally update details and submit
9. Verify in `/store/orders/history` that order appears

**`e2e/return-shipment-flow.spec.ts`** (new)

1. (Setup) Seed a shipment with quality check failures via API (which auto-creates return)
2. Login as WAREHOUSE user
3. Navigate to `/warehouse/returns`
4. Find the return and click "Mark Packed"
5. (Setup) Simulate branch pickup (via API call to mark WAREHOUSE state)
6. Click "Mark In Transit"
7. Click "Mark Received"
8. Confirm return status is RECEIVED and return items are visible in DC inventory

**`e2e/movement-ledger.spec.ts`** (new)

1. Login as WAREHOUSE user
2. (Setup) Create several transactions (inbound shipment, customer order, adjustment)
3. Navigate to `/warehouse/monitor` → Network Movement Ledger tab
4. Filter by store → confirm only that store's entries shown
5. Filter by movement type (IN) → confirm only IN entries shown
6. Filter by date range → confirm only entries in range shown
7. Export to CSV → confirm file downloads

**`e2e/stakeholder-dashboard.spec.ts`** (new)

1. Login as STAKEHOLDER user
2. Confirm redirected to `/dashboards`
3. Executive Summary dashboard loads with metrics
4. Set date range → metrics update
5. Click on "Branch Performance" report → navigates to branch detail
6. Confirm drill-down shows branch-specific data

**`e2e/multi-context-switch.spec.ts`** (new)

1. Login as STORE user with access to 2 branches
2. (Setup) Store selector shown in layout
3. Switch to different branch
4. Confirm all views show data for new branch only
5. Navigate between pages → store context persists
6. Logout and login again → selected branch is remembered

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
