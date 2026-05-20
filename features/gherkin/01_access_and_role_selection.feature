Feature: Access and role selection
  As an operations user
  I want to enter the system with the right role and branch context
  So that I can perform the correct business tasks

  Scenario: Enter as a branch user
    Given I am on the sign in page
    When I choose the branch role
    And I continue to the workspace
    Then I should see branch operations relevant to pharmacy stores

  Scenario: Enter as a distribution user
    Given I am on the sign in page
    When I choose the distribution role
    And I continue to the workspace
    Then I should see distribution operations relevant to network fulfillment

  Scenario: Change role during operations
    Given I am already working in the system
    When I switch from one role to another
    Then I should land in the matching workspace for that role

  Scenario: Select a specific branch
    Given I am working as a branch user
    When I select a different branch location
    Then all branch views should show information for the selected location only

  Scenario: Log out from the workspace
    Given I am in any workspace page
    When I choose to log out
    Then I should return to the sign in page
