Feature: Refill request submission from branch
  As a branch pharmacist
  I want to submit replenishment requests for low stock
  So that distribution can fulfill branch needs in time

  Scenario: Build a refill request from low-stock medications
    Given I am reviewing low-stock medications at my branch
    When I prepare a refill request
    Then I should see recommended reorder quantities

  Scenario: Submit a refill request to distribution
    Given I have prepared refill quantities
    When I submit the request
    Then the request should be available to distribution for fulfillment

  Scenario: See refill outcomes in history
    Given refill requests have been processed
    When I review branch-related fulfillment records
    Then I should see completed replenishment outcomes
