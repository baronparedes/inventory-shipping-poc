Feature: Customer medication order creation
  As a branch pharmacist
  I want fast and accurate medication order entry
  So that I can serve customers efficiently

  Scenario: Require order header details before adding medications
    Given I am creating a customer medication order
    When customer name or order reference is missing
    Then I should be guided to complete those required details first

  Scenario: Add medications through the add-item flow
    Given I have entered required order details
    When I search for a medication and add it to the order
    Then the medication should appear in the current order

  Scenario: Edit quantities in the current order
    Given I have medications in the current order
    When I change a medication quantity
    Then the updated quantity should be reflected immediately

  Scenario: Remove medications from the current order
    Given I have medications in the current order
    When I remove one medication line
    Then that medication should no longer appear in the current order

  Scenario: Complete a customer order
    Given I have a valid customer order with one or more medications
    When I complete the order
    Then branch inventory should decrease according to dispensed quantities
    And the order should be saved in customer order history
