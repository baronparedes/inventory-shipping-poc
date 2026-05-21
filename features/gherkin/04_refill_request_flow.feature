
Feature: Refill request submission from branch
  As a branch pharmacist
  I want to submit replenishment requests for any medication, regardless of current stock level
  So that distribution can fulfill branch needs in time or in advance


  Scenario: Build a refill request from low-stock medications
    Given I am reviewing low-stock medications at my branch
    When I prepare a refill request
    Then I should see recommended reorder quantities

  Scenario: Build a refill request for any medication
    Given I am viewing the inventory at my branch
    When I choose to create a refill request
    Then I should be able to add any medication to the request, regardless of its current stock level
    And I should be able to specify the requested quantity for each medication


  Scenario: Submit a refill request to distribution
    Given I have prepared refill quantities for one or more medications
    When I submit the request
    Then the request should be available to distribution for fulfillment

  Scenario: See refill outcomes in history
    Given refill requests have been processed
    When I review branch-related fulfillment records
    Then I should see completed replenishment outcomes
