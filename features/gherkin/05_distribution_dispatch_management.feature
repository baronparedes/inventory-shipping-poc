Feature: Distribution dispatch planning and execution
  As a distribution planner
  I want to convert branch needs into managed dispatches
  So that replenishment is timely and traceable

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
