Feature: Stakeholder reporting and dashboards
  As a stakeholder
  I want access to comprehensive reports and dashboards
  So that I can make informed decisions about inventory, distribution, and branch performance

  # Terms are defined in docs/glossary.md

  Scenario: View executive summary dashboard
    Given I am logged in as a stakeholder
    When I open the executive summary dashboard
    Then I should see key metrics including:
      | Total network inventory value           |
      | Stockout rate (branches, products)      |
      | On-time shipment rate                   |
      | Average fulfillment lead time           |
      | Top 5 fast-moving products              |
      | Top 5 slow-moving products              |
      | Total orders served (period selectable) |
      | Total refill requests (period selectable)|
      | Near-expiry quantity and exposure       |
      | Expired quantity and exposure           |

  Scenario: View inventory aging report
    Given I am on the reporting page
    When I select the inventory aging report
    Then I should see breakdowns by product, branch, and warehouse
    And I should see quantities and value of stock by age bucket (e.g., <30d, 31-60d, 61-90d, >90d)
    And I should see expiration-risk breakdowns aligned with configured thresholds

  Scenario: View branch performance dashboard
    Given I am on the dashboards page
    When I select the branch performance dashboard
    Then I should see for each branch:
      | Orders served (trend)           |
      | Stockouts (count, trend)        |
      | Average inventory turnover rate |
      | Refill request frequency        |
      | Shipment delays (if any)        |

  Scenario: View distribution center performance dashboard
    Given I am on the dashboards page
    When I select the distribution center performance dashboard
    Then I should see for each center:
      | Shipments dispatched (trend)    |
      | On-time dispatch rate           |
      | Inventory accuracy (audit vs system) |
      | Outbound vs inbound movement    |
      | Returns processed               |

  Scenario: View product movement and demand report
    Given I am on the reporting page
    When I select the product movement and demand report
    Then I should see:
      | Product-level movement (IN/OUT) by period |
      | Demand forecast (trend)                   |
      | Branch-level demand breakdown             |
      | Near-expiry and expired movement context  |

  Scenario: Export reports for offline analysis
    Given I am viewing any report
    When I choose to export
    Then I should be able to download the report as CSV, Excel, or PDF

  Scenario: Filter and drill down in dashboards
    Given I am viewing a dashboard or report
    When I apply filters (date range, branch, product, center)
    Then all metrics and charts should update accordingly
    And I should be able to drill down to see underlying transactions or records

  Scenario: View expiry trend dashboard
    Given I am logged in as a stakeholder
    When I open expiry trend reporting
    Then I should see trend lines for near-expiry and expired quantities over time
    And I should be able to break down results by branch, product, and distribution center
