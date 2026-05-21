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


  Scenario: Quality check during shipment receiving
    Given I am viewing a valid incoming shipment
    When I perform a quality check on each medication in the shipment
    Then I should be able to mark any medication line as expired or damaged
    And I should see a summary of items to accept and items to return

  Scenario: Return expired or damaged medications to warehouse
    Given I have marked one or more medications as expired or damaged during quality check
    When I confirm the return
    Then only accepted items should be added to branch inventory
    And returned items should not be added to inventory
    And a return shipment should be created back to the warehouse for the expired or damaged items
    And the shipment status should reflect partial acceptance and return

  Scenario: Receive an incoming shipment (all items accepted)
    Given I am viewing a valid incoming shipment
    When I perform a quality check and all items pass
    And I confirm receipt
    Then branch inventory should increase by the shipment quantities
    And the shipment should be marked as completed
