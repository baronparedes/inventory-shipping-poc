import {useMemo, useState} from "react";
import {NavLink, Outlet, useNavigate} from "react-router-dom";
import {getStoreById, stores} from "../mocks/mockData";
import {usePrototypeState} from "../state/usePrototypeState";
import type {Role} from "../types/domain";

interface AppShellProps {
  role: Role;
}

interface TourStep {
  path: string;
  title: string;
  script: string;
  talkingPoints: string[];
}

const roleTitles: Record<Role, string> = {
  store: "Pharmacy Branch Console",
  warehouse: "Central Distribution Console",
  stakeholder: "Stakeholder Oversight Console",
};

const roleDescriptions: Record<Role, string> = {
  store: "Track medication movement, detect shortages, and request replenishment.",
  warehouse: "Monitor all pharmacy branches, prioritize shortages, and prepare dispatches.",
  stakeholder:
    "Review network-wide movement, service pressure, and fulfillment performance in read-only mode.",
};

const navLinks: Record<Role, Array<{path: string; label: string}>> = {
  store: [
    {path: "/app/store/dashboard", label: "Dashboard"},
    {path: "/app/store/inventory", label: "Pharmacy Inventory"},
    {path: "/app/store/customer-orders", label: "Create Customer Order"},
    {path: "/app/store/customer-orders/history", label: "Order History"},
    {path: "/app/store/reorder", label: "Refill Requests"},
  ],
  warehouse: [
    {path: "/app/warehouse/dashboard", label: "Dashboard"},
    {path: "/app/warehouse/monitor", label: "Branch Monitoring"},
    {path: "/app/warehouse/shipping", label: "Dispatch Orders"},
    {path: "/app/warehouse/tracking", label: "Shipment Tracking"},
  ],
  stakeholder: [
    {path: "/app/stakeholder/dashboard", label: "Dashboard"},
    {path: "/app/stakeholder/reports", label: "Movement Reports"},
  ],
};

export function AppShell({role}: AppShellProps) {
  const navigate = useNavigate();
  const {setPreferredRole, selectedStoreId, setSelectedStoreId, resetPrototypeData} =
    usePrototypeState();
  const selectedStore = getStoreById(selectedStoreId) ?? stores[0];
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isTourMinimized, setIsTourMinimized] = useState(false);
  const [tourRole, setTourRole] = useState<Role | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const activeTourRole = tourRole ?? role;

  const closeSidebar = () => setIsSidebarOpen(false);

  const tourSteps = useMemo<TourStep[]>(() => {
    if (activeTourRole === "store") {
      return [
        {
          path: "/app/store/dashboard",
          title: "Branch Dashboard",
          script:
            "Use this page as the branch command center to review current risk, refill pressure, and immediate priorities.",
          talkingPoints: [
            "Review low-stock and critical indicators first to identify possible service interruptions.",
            "Change the branch to re-scope all metrics and queues to the selected location.",
            "Use this view to decide whether to monitor, serve customers, request refills, or receive shipments.",
          ],
        },
        {
          path: "/app/store/customer-orders",
          title: "Customer Order Entry",
          script:
            "Follow this workflow to capture customer details, build an order quickly, and complete it with required validations.",
          talkingPoints: [
            "Add medications through search so orders can be assembled without leaving this workspace.",
            "Use inline quantity edits for quick corrections during counter interaction.",
            "Complete required fields (customer name and Rx number) before finalizing the order.",
            "Complete the order to register stock-out movement for branch-level traceability.",
          ],
        },
        {
          path: "/app/store/reorder",
          title: "Refill Request Submission",
          script:
            "Use this page to convert branch demand into a formal refill request for distribution planning.",
          talkingPoints: [
            "Review suggested refill quantities to confirm replenishment intent.",
            "Adjust quantities as needed to account for local demand spikes.",
            "Submit the request to send it directly into the distribution workload.",
          ],
        },
        {
          path: "/app/store/inventory",
          title: "Receiving and Branch Ledger",
          script:
            "Use this page to execute receiving, update on-hand stock, and verify movement audit entries.",
          talkingPoints: [
            "Open shipment details and verify expected versus delivered quantities before receiving.",
            "Confirm receipt to apply controlled stock increases to branch inventory.",
            "Review IN and OUT entries with timestamps and transaction context in the movement ledger.",
            "Use this ledger as the branch-level source for reconciliation and accountability.",
          ],
        },
        {
          path: "/app/store/customer-orders/history",
          title: "Order History",
          script:
            "Use this page to review historical traceability of what was dispensed, when it happened, and which order it came from.",
          talkingPoints: [
            "Review completed orders to keep front-counter activity connected to retained records.",
            "Use this view for disputes, return checks, and audit follow-ups.",
            "Confirm that order creation, stock movement, and historical proof remain connected.",
          ],
        },
      ];
    }

    if (activeTourRole === "warehouse") {
      return [
        {
          path: "/app/warehouse/dashboard",
          title: "Distribution Dashboard",
          script:
            "Start distribution operations here by reviewing branch demand signals, shipment workload, and fulfillment priorities.",
          talkingPoints: [
            "Review pending refill requests as incoming demand from the branch network.",
            "Check open shipments to track work already committed and in motion.",
            "Open request details to evaluate urgency and dispatch quantities.",
          ],
        },
        {
          path: "/app/warehouse/shipping",
          title: "Dispatch Management",
          script:
            "Use this page to execute fulfillment from request selection through dispatch progression and shipment tracking.",
          talkingPoints: [
            "Create dispatches to commit stock for branch replenishment.",
            "Progress dispatches through packed and in-transit checkpoints.",
            "Review completed dispatch history for SLA visibility and follow-through.",
          ],
        },
        {
          path: "/app/warehouse/tracking",
          title: "Shipment Tracking Board",
          script:
            "Use this page to present shipment location checkpoints and timeline movement in one board.",
          talkingPoints: [
            "Filter by branch and status for focused movement storytelling.",
            "Open timeline checkpoints to explain where each shipment is now.",
            "Use this board as the primary live-demo movement surface.",
          ],
        },
        {
          path: "/app/warehouse/monitor",
          title: "Branch Monitoring and Network Ledger",
          script:
            "Use this page for network supervision by comparing branch health and verifying centralized movement auditability.",
          talkingPoints: [
            "Inspect branch-level inventory detail to identify at-risk locations early.",
            "Review consolidated IN and OUT records across branches in one network ledger.",
            "Use this as the cross-branch audit and decision surface for central operations.",
          ],
        },
      ];
    }

    return [
      {
        path: "/app/stakeholder/dashboard",
        title: "Executive Dashboard",
        script:
          "Use this page for executive snapshots covering movement pressure, refill load, and in-transit visibility.",
        talkingPoints: [
          "Use the KPI cards for immediate network risk posture.",
          "Call out top-moving medications to show demand concentration.",
          "Pivot into reports for transaction-level transparency.",
        ],
      },
      {
        path: "/app/stakeholder/reports",
        title: "Movement Reporting",
        script:
          "Use this report to trace movement events and shipment cycle time without operational editing.",
        talkingPoints: [
          "Filter by branch to isolate local movement trends.",
          "Use cycle time view to explain delivery performance over time.",
          "Highlight that this role is read-only for governance demonstrations.",
        ],
      },
    ];
  }, [activeTourRole]);

  const currentTourStep = tourSteps[tourStepIndex];

  const startTour = () => {
    setIsTourOpen(true);
    setIsTourMinimized(false);
    setTourRole(null);
    setTourStepIndex(0);
  };

  const chooseTourRole = (selectedTourRole: Role) => {
    setTourRole(selectedTourRole);
    setTourStepIndex(0);
    setPreferredRole(selectedTourRole);
    navigate(
      selectedTourRole === "store"
        ? "/app/store/dashboard"
        : selectedTourRole === "warehouse"
          ? "/app/warehouse/dashboard"
          : "/app/stakeholder/dashboard",
    );
  };

  const goToStep = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(tourSteps.length - 1, nextIndex));
    setTourStepIndex(boundedIndex);
    setPreferredRole(activeTourRole);
    navigate(tourSteps[boundedIndex].path);
  };

  const endTour = () => {
    setIsTourOpen(false);
    setIsTourMinimized(false);
    setTourRole(null);
    setTourStepIndex(0);
  };

  return (
    <div className="app-shell">
      {isSidebarOpen ? (
        <div className="nav-overlay" aria-hidden="true" onClick={closeSidebar} />
      ) : null}

      <aside className={`side-panel${isSidebarOpen ? " open" : ""}`}>
        <p className="eyebrow">Pharmacy Inventory + Dispatch</p>
        <h1>{roleTitles[role]}</h1>
        <p className="muted-copy">{roleDescriptions[role]}</p>

        <div className="role-switch">
          <label htmlFor="role-picker">Role Switch</label>
          <select
            id="role-picker"
            value={role}
            onChange={event => {
              const selectedRole = event.target.value as Role;
              setPreferredRole(selectedRole);
              navigate(`/app/${selectedRole}/dashboard`);
            }}
          >
            <option value="store">Pharmacy Branch</option>
            <option value="warehouse">Distribution Center</option>
            <option value="stakeholder">Stakeholder</option>
          </select>
        </div>

        {role === "store" && selectedStore ? (
          <div className="role-switch">
            <label htmlFor="store-picker">Pharmacy Store</label>
            <select
              id="store-picker"
              value={selectedStore.id}
              onChange={event => setSelectedStoreId(event.target.value)}
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.city})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="main-nav" aria-label="Main sections">
          {navLinks[role].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({isActive}) => (isActive ? "nav-item active" : "nav-item")}
              onClick={closeSidebar}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            resetPrototypeData();
            navigate(`/app/${role}/dashboard`);
          }}
        >
          Reset Data
        </button>

        <button type="button" className="secondary-btn" onClick={() => navigate("/login")}>
          Log Out
        </button>
        <button type="button" className="primary-btn" onClick={startTour}>
          Start Guided Tour
        </button>
      </aside>

      <main className="content-panel">
        <div className="mobile-topbar">
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Open navigation"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <p className="eyebrow" style={{margin: 0}}>
            {roleTitles[role]}
          </p>
        </div>

        <Outlet />
      </main>

      {isTourOpen ? (
        <section className="tour-dock" role="dialog" aria-label="Guided tour">
          <div className="tour-dock-head">
            <p className="eyebrow">Guided Tour</p>
            <div className="actions-row tour-dock-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label={isTourMinimized ? "Expand tour" : "Minimize tour"}
                title={isTourMinimized ? "Expand tour" : "Minimize tour"}
                onClick={() => setIsTourMinimized(previous => !previous)}
              >
                {isTourMinimized ? "+" : "-"}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close tour"
                title="Close tour"
                onClick={endTour}
              >
                X
              </button>
            </div>
          </div>

          {isTourMinimized ? null : (
            <div className="tour-dock-body">
              {tourRole === null ? (
                <>
                  <h2>Choose View</h2>
                  <p className="muted-copy">
                    Pick the demo track you want to present first.
                  </p>
                  <div className="tour-choice-grid">
                    <button
                      type="button"
                      className="tour-choice-btn"
                      onClick={() => chooseTourRole("store")}
                    >
                      Pharmacy Branch View
                    </button>
                    <button
                      type="button"
                      className="tour-choice-btn"
                      onClick={() => chooseTourRole("warehouse")}
                    >
                      Distribution View
                    </button>
                    <button
                      type="button"
                      className="tour-choice-btn"
                      onClick={() => chooseTourRole("stakeholder")}
                    >
                      Stakeholder View
                    </button>
                  </div>
                  <div className="actions-row tour-actions">
                    <button type="button" className="secondary-btn" onClick={endTour}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="eyebrow">
                    Demo Step {tourStepIndex + 1} of {tourSteps.length}
                  </p>
                  <div className="tour-progress" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.round(((tourStepIndex + 1) / tourSteps.length) * 100)}%`,
                      }}
                    />
                  </div>

                  <h2>{currentTourStep.title}</h2>
                  <p className="muted-copy">{currentTourStep.script}</p>

                  <ul className="tour-points">
                    {currentTourStep.talkingPoints.map(point => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>

                  <label className="tour-jump" htmlFor="tour-step-jump">
                    Jump to Step
                    <select
                      id="tour-step-jump"
                      value={tourStepIndex}
                      onChange={event => goToStep(Number(event.target.value))}
                    >
                      {tourSteps.map((step, index) => (
                        <option key={step.path} value={index}>
                          {index + 1}. {step.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="actions-row tour-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setTourRole(null)}
                    >
                      Change View
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={tourStepIndex === 0}
                      onClick={() => goToStep(tourStepIndex - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        tourStepIndex === tourSteps.length - 1
                          ? endTour()
                          : goToStep(tourStepIndex + 1)
                      }
                    >
                      {tourStepIndex === tourSteps.length - 1 ? "Finish Tour" : "Next"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
