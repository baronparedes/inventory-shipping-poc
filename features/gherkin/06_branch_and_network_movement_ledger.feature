Feature: Inventory movement ledger across branch and network
  As an operations leader
  I want a detailed movement ledger
  So that stock changes are fully traceable

  # Terms are defined in docs/glossary.md

  Scenario: Record inbound movement when a branch receives shipment
    Given a branch receives a shipment
    When receipt is confirmed
    Then a movement entry should be recorded as inbound
    And the entry should include branch, medication, quantity, time, and reference
    And the entry should include batch identifier and expiration date when available

  Scenario: Record outbound movement when a customer order is completed
    Given a branch completes a customer medication order
    When order quantities are dispensed
    Then movement entries should be recorded as outbound
    And each entry should include branch, medication, quantity, time, and reference
    And each entry should include the source batch identifier and expiration date

  Scenario: View branch movement ledger
    Given I am working as a branch user
    When I open the branch movement ledger
    Then I should see branch-only inbound and outbound entries in reverse time order

  Scenario: View network movement ledger in distribution center
    Given I am working as a distribution user
    When I open the network movement ledger
    Then I should see movement entries across all branches
    And each row should show branch identity and transaction context

  Scenario: Filter movement ledger by expiration status
    Given I am viewing a movement ledger
    When I filter by expiration status (healthy, near-expiry, expired)
    Then only matching movement entries should be shown
