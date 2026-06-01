Feature: Distribution center inventory movement ledger
  As a distribution center manager
  I want a detailed movement ledger for the distribution center
  So that all stock changes are fully traceable and auditable

  # Terms are defined in docs/glossary.md

  Scenario: Record inbound movement when receiving supplier shipment
    Given the distribution center receives a shipment from a supplier
    When receipt is confirmed
    Then a movement entry should be recorded as inbound
    And the entry should include distribution center, medication, quantity, time, and reference
    And the entry should include batch identifier and expiration date when available

  Scenario: Record outbound movement when dispatching to a branch
    Given the distribution center dispatches a shipment to a branch
    When the dispatch is confirmed and leaves the warehouse
    Then a movement entry should be recorded as outbound
    And the entry should include distribution center, medication, quantity, time, and reference
    And the entry should include source batch identifier and expiration date

  Scenario: Record adjustment movement for loss, damage, or audit
    Given an inventory adjustment is made in the distribution center
    When the adjustment is recorded (loss, damage, audit, etc.)
    Then a movement entry should be recorded as an adjustment
    And the entry should include distribution center, medication, quantity, time, reference, and reason

  Scenario: View distribution center movement ledger
    Given I am working as a distribution center user
    When I open the distribution center movement ledger
    Then I should see all inbound, outbound, and adjustment entries in reverse time order
    And each row should show medication, quantity, movement type, reference, and context

  Scenario: Filter movement ledger by medication or date
    Given I am viewing the distribution center movement ledger
    When I filter by medication or date range
    Then only matching movement entries should be shown

  Scenario: Filter movement ledger by expiration risk
    Given I am viewing the distribution center movement ledger
    When I filter by expiration status (healthy, near-expiry, expired)
    Then only movement entries for the selected status should be shown
