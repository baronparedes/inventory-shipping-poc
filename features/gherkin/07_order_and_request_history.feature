Feature: Historical records for operations review
  As a pharmacy and distribution leader
  I want complete business histories
  So that I can validate outcomes and review prior decisions

  # Terms are defined in docs/glossary.md

  Scenario: View branch customer order history
    Given customer medication orders have been completed
    When I open order history
    Then I should see completed order records with customer and quantity details

  Scenario: Review expiration decisions in order history
    Given customer medication orders have been completed
    When I inspect an order detail record
    Then I should see whether a near-expiry warning was shown at dispense time
    And I should see batch identifiers and expiration dates used for fulfillment

  Scenario: View branch shipment receiving outcomes
    Given the branch has received shipments over time
    When I review receiving context
    Then I should see completed shipment outcomes reflected in inventory and ledger records

  Scenario: View distribution refill and dispatch history
    Given refill and dispatch cycles have been executed
    When I review distribution history views
    Then I should see completed records for refill fulfillment and dispatch completion

  Scenario: Audit expiration outcomes in refill and dispatch history
    Given refill and dispatch cycles have been executed
    When I inspect a completed refill or dispatch record
    Then I should see expiration-related context used in fulfillment decisions
