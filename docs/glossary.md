# Glossary

This glossary defines the standard terms used by features and prototype implementation.

## Expiration and Inventory Terms

- Expiration Date: The last valid date when a medication batch can be safely dispensed.
- Expired Batch: A batch with expiration date before the current business date. Expired batches are blocked from dispensing.
- Near-Expiry Batch: A non-expired batch that is within the warning threshold for its product or category.
- Expiry Warning Threshold: Number of days used to classify a batch as near-expiry. Can be configured by product or category.
- FEFO (First Expiry, First Out): Stock consumption rule that prioritizes dispensing the earliest non-expired batch first.
- Usable Stock: Sum of quantities from non-expired batches that are valid for dispensing.
- Quarantined Stock: Stock that is not allowed for normal dispensing due to damage, quality issue, recall, or policy hold.

## Movement and Traceability Terms

- Batch Traceability: Ability to track inventory actions by batch identifier and expiration date.
- Dispatch Batch Line: A shipment line that represents a specific batch ID, quantity, and expiry date for dispatch.
- FEFO Dispatch Preview: Pre-dispatch view showing the batch lines and expiry statuses that will be created for a shipment.
- Movement Ledger: Chronological audit of inventory changes (IN, OUT, ADJUSTMENT) with context.
- Movement Reference: Link between a movement entry and its source document (order, shipment, adjustment).
- Shelf-Life at Dispatch: Remaining days before expiration at the time a dispatch is confirmed.
- Batch Intake: Receiving action that records inbound stock as individual batch lines instead of only aggregated quantity.
- Quality-Check Shipment Metadata: Required shipment line fields (`batchId`, `expiryDate`) that branch users validate before receiving stock.

## Operational Terms

- Dispense Block: Validation that prevents completion of an order when selected stock is invalid (for example expired).
- Dispense Warning: Non-blocking message shown when near-expiry stock is being dispensed.
- Expiry Risk: Operational condition where a branch, center, or product has significant near-expiry or expired stock.
- Partial Acceptance: Receiving outcome where only quality-passed lines are accepted and others are returned.

## Reporting Terms

- Expired Quantity: Total units already past expiration.
- Near-Expiry Quantity: Total units within threshold but still valid.
- Expiry Exposure: Share of total stock classified as near-expiry or expired.
- Expiry Trend: Time-series view of near-expiry and expired quantities.

## Baseline Policy

- Expired batches are blocked from dispensing.
- Near-expiry batches show warnings but can still be dispensed.
- FEFO applies to all eligible non-expired batches.
- Expiry warning thresholds are configurable at product or category level.
