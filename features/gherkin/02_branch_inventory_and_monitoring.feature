Feature: Branch inventory visibility and monitoring
  As a branch pharmacist
  I want clear visibility of stock and movement
  So that I can prevent shortages and act quickly

  Scenario: View current branch inventory
    Given I am working as a branch user
    When I open inventory monitoring
    Then I should see each medication with current on hand quantity
    And I should see weekly demand indicators

  Scenario: See inbound shipment opportunities
    Given there are incoming shipments for my branch
    When I open shipment receiving
    Then I should see each shipment with expected arrival and item totals

  Scenario: View shipment details before receiving
    Given I am reviewing an incoming shipment
    When I open shipment details
    Then I should see shipment summary information
    And I should see the list of medications and quantities in that shipment

  Scenario: Receive an incoming shipment
    Given I am viewing a valid incoming shipment
    When I confirm receipt
    Then branch inventory should increase by the shipment quantities
    And the shipment should be marked as completed
