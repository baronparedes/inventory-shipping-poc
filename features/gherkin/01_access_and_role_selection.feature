
Feature: Access and context selection
  As an operations or stakeholder user
  I want to access all branch and distribution center features I am permitted for, or view reporting and dashboards as a stakeholder
  So that I can perform the correct business tasks or view analytics in the right location or center

  # Terms are defined in docs/glossary.md
  Scenario: Enter as a stakeholder user
    Given I am on the sign in page
    When I sign in as a user with the Stakeholder role
    Then I should only see reporting and dashboard views
    And I should not have access to inventory, dispatch, or order management features
    And I should be able to view expiry risk and inventory aging reports


  Scenario: Enter as a user with access to multiple branches
    Given I am on the sign in page
    When I sign in as a user with permission to access multiple branches
    Then I should be prompted to select a branch from my available branches
    When I select a branch
    Then I should see branch operations relevant to the selected pharmacy store

  Scenario: Enter as a user with access to multiple distribution centers
    Given I am on the sign in page
    When I sign in as a user with permission to access multiple distribution centers
    Then I should be prompted to select a distribution center from my available centers
    When I select a distribution center
    Then I should see distribution operations relevant to the selected center

  Scenario: Switch context during operations
    Given I am already working in the system
    When I select a different branch or distribution center from those I am permitted to access
    Then all views should update to show information for the newly selected context only

  Scenario: Access both branch and distribution features if permitted
    Given I am signed in as a user with permission to access both branches and distribution centers
    When I select a branch
    Then I should see branch operations for that branch
    When I select a distribution center
    Then I should see distribution operations for that center

  Scenario: Apply expiration policy visibility by role
    Given expiration management is enabled
    When I sign in as a branch user
    Then I should see near-expiry warnings and dispense blocking messages for expired batches
    When I sign in as a distribution user
    Then I should see expiration context for dispatch and movement monitoring
    When I sign in as a stakeholder user
    Then I should only see expiration analytics and reporting views

  Scenario: Log out from the workspace
    Given I am in any workspace page
    When I choose to log out
    Then I should return to the sign in page
