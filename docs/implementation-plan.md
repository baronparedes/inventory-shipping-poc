# Vertically Sliced Implementation Plan

This plan provides a vertical slicing approach for implementing all features, considering dependencies and maximizing value delivery at each step.

---

## 0. Documentation Baseline (Gate Before Coding)
- Update all Gherkin feature files with the agreed expiration-management behaviors.
- Publish and maintain canonical terminology in `docs/glossary.md`.
- Align operational flow details in `docs/inventory-flow.md` with feature acceptance criteria.
- Keep guided tour scripts in `src/components/AppShell.tsx` synchronized with implemented workflows and policy behavior.
- Confirm requirements consistency before starting prototype implementation.

Expiration policy baseline:
- Expired batches are blocked from dispensing.
- Near-expiry batches show warnings but can still be dispensed.
- FEFO applies to non-expired batches.
- Warning thresholds are configurable by product/category.
- Dispatch creation includes FEFO batch preview with batch ID and expiry visibility before confirmation.
- Shipment quality checks require every shipment line to include batch ID and expiry date.

---

## 1. Foundation & Access
- User authentication, context selection, and permissions (branches, distribution centers, stakeholder)
- Context switching and access control for all roles
- Stakeholder role: dashboards/reports only, no inventory/dispatch/order actions

---

## 2. Core Inventory & Movement
- Branch inventory monitoring (view, inbound shipments, quality check, returns)
- Distribution center inventory management (view, adjust, prevent over-dispatch, movement log)
- Movement ledgers for both branches and distribution centers (traceability, filtering)

---

## 3. Customer Orders & Refill Requests
- Customer order creation (with optional details, returning customer lookup)
- Order history for branches
- Refill request creation (for any medication, not just low stock)
- Refill request history

---

## 4. Dispatch & Shipment Management
- Distribution: review refill demand, create/prepare/dispatch shipments, prevent over-dispatch
- Branch: real-time shipment tracking, receive shipments, handle partial/return flows
- Shipment movement history and notifications for branches

---

## 5. Reporting & Dashboards
- Stakeholder dashboards: executive summary, inventory aging, branch/DC performance, product movement/demand
- Export and drill-down features
- Filtering by date, branch, product, center

---

## 6. Audit, History & Observability
- Complete order, shipment, and inventory movement histories for audit
- Logging, error handling, and observability for all flows

---

## Implementation Order (Vertical Slices)

1. **Documentation Baseline (Required Gate)**
   - Update all relevant feature specs first
   - Update glossary and flow documentation
   - Freeze baseline acceptance criteria for implementation
2. **User Access & Context**
   - Auth, context selection, role/permission enforcement
   - Stakeholder dashboard shell (empty state)
3. **Branch Inventory & Orders**
   - Inventory view, inbound shipments, quality check/returns
   - Customer order creation, order history, returning customer
4. **Distribution Inventory & Dispatch**
   - DC inventory management, movement ledger
   - Refill request (any med), dispatch creation, prevent over-dispatch
5. **Shipment Tracking & Real-Time**
   - Real-time shipment tracking for branches
   - Movement history, notifications, partial/return flows
6. **Reporting & Stakeholder Dashboards**
   - Executive summary, inventory aging, performance dashboards, product movement
   - Export, filtering, drill-down
7. **Audit & History**
   - Complete movement, order, shipment, and adjustment logs
   - Stakeholder and admin audit views

---

**Tip:**
Each vertical slice should include backend (API, DB), frontend (UI, state), and integration tests for the features in that slice.
After each slice, verify acceptance criteria from the Gherkin features.
