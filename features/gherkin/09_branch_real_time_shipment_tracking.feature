Feature: Real-time shipment tracking for branch operators
  As a branch operator
  I want to track the movement of shipments to my branch in real time
  So that I can anticipate arrivals and prepare for receiving

  # Terms are defined in docs/glossary.md

  Scenario: View real-time status of inbound shipments
    Given I am logged in as a branch operator
    When I open the inbound shipments tracking view
    Then I should see a list of all shipments currently in transit to my branch
    And for each shipment, I should see its current status (e.g., Packed, In Transit, Out for Delivery, Delivered)
    And I should see estimated arrival time (ETA) and last known location if available

  Scenario: Receive live updates as shipment status changes
    Given a shipment to my branch is in transit
    When the shipment status is updated by the distribution center or logistics provider
    Then the new status and location should appear in my tracking view in real time

  Scenario: Notify branch operator of imminent arrival
    Given a shipment is near arrival at my branch
    When the shipment is within a configurable distance or time from the branch
    Then I should receive a notification or alert in the system

  Scenario: View shipment movement history
    Given I am viewing a shipment's details
    When I open the movement history
    Then I should see a timeline of all status changes and location updates for that shipment

  Scenario: View expiration risk in shipment details
    Given I am viewing details of an inbound shipment
    When the shipment contains medication batches
    Then I should see batch-level expiration dates
    And I should see warnings for any near-expiry or expired items before receiving

  Scenario: Highlight incomplete shipment metadata before receiving
    Given I am viewing details of an inbound shipment
    When one or more shipment lines are missing batch identifier or expiration date
    Then I should see a quality-check warning that receiving cannot proceed
    And I should see which shipment lines require metadata completion
