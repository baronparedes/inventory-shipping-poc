
Feature: Distribution dispatch planning, execution, and inventory management
  As a distribution planner
  I want to convert branch needs into managed dispatches
  And manage the inventory of the distribution center
  So that replenishment is timely, traceable, and the warehouse stock is always accurate

  # Terms are defined in docs/glossary.md
  
  Scenario: View and manage distribution center inventory
    Given I am in the distribution workspace
    When I open the inventory management view
    Then I should see a list of all medications and supplies in the distribution center
    And I should see current on-hand quantities, reserved for dispatch, and available stock

  Scenario: Adjust distribution center inventory
    Given I am in the distribution inventory management view
    When I receive new stock from suppliers
    Then I should be able to record an inbound inventory adjustment
    And the on-hand quantity should increase accordingly

    When I perform a stock adjustment for loss, damage, or audit
    Then I should be able to record an adjustment with a reason
    And the on-hand quantity should update accordingly

  Scenario: Prevent over-dispatching from warehouse
    Given I am creating a dispatch for a branch
    When I select items and quantities to dispatch
    Then I should not be able to dispatch more than the available stock in the distribution center

  Scenario: Block dispatch of expired stock
    Given I am creating a dispatch for a branch
    When selected stock includes expired batches
    Then dispatch confirmation should be blocked for those batches
    And I should see an error indicating expired stock cannot be dispatched

  Scenario: Warn on low remaining shelf-life at dispatch
    Given I am creating a dispatch for a branch
    When selected stock includes near-expiry batches
    Then I should see a warning about shelf-life at dispatch
    And I should still be allowed to proceed based on policy

  Scenario: Block dispatch confirmation when shipment metadata is missing
    Given I am creating a dispatch for a branch
    And one or more shipment lines are missing batch identifier or expiration date
    When I attempt to confirm dispatch
    Then dispatch confirmation should be blocked
    And I should see which shipment lines need metadata completion

  Scenario: Track inventory movement in the distribution center
    Given inventory changes occur in the distribution center (inbound, outbound, adjustment)
    When I review the inventory movement log
    Then I should see all movements with type (IN, OUT, ADJUSTMENT), quantity, date, and reference

  Scenario: Review branch refill demand
    Given I am in the distribution workspace
    When I review open refill requests
    Then I should see branch, urgency, and item counts for each request

  Scenario: Create a dispatch from a refill request
    Given an open refill request is ready for fulfillment
    When I create a dispatch
    Then the dispatch should appear in the active dispatch queue

  Scenario: Confirm and prepare dispatch contents
    Given I am preparing a dispatch
    When I review request items and confirm dispatch
    Then the dispatch should move to a prepared state for outbound movement

  Scenario: Progress dispatch through transit stages
    Given a dispatch is prepared for outbound transfer
    When I move it to in-transit and then completed states
    Then dispatch tracking should reflect each business stage accurately

  Scenario: Review dispatch and refill histories
    Given dispatches and refill requests have been completed
    When I review distribution history views
    Then I should see completed records for operational auditing

  Scenario: Preserve batch traceability in dispatch operations
    Given I am reviewing dispatch operations
    When I inspect a completed dispatch
    Then each dispatched medication line should include batch identifier and expiration date
