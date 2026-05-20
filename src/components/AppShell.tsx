import {NavLink, Outlet, useLocation, useNavigate} from "react-router-dom";
import {getStoreById, stores} from "../mocks/mockData";
import {usePrototypeState} from "../state/usePrototypeState";
import type {Role} from "../types/domain";

interface AppShellProps {
  role: Role;
}

const roleTitles: Record<Role, string> = {
  store: "Pharmacy Branch Console",
  warehouse: "Central Distribution Console",
};

const roleDescriptions: Record<Role, string> = {
  store: "Track medication movement, detect shortages, and request replenishment.",
  warehouse: "Monitor all pharmacy branches, prioritize shortages, and prepare dispatches.",
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
  ],
};

export function AppShell({role}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {setPreferredRole, selectedStoreId, setSelectedStoreId, resetPrototypeData} =
    usePrototypeState();
  const selectedStore = getStoreById(selectedStoreId) ?? stores[0];

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <p className="eyebrow">Pharmacy Inventory + Dispatch Prototype</p>
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
          Reset Prototype Data
        </button>

        <p className="route-hint">Active Route: {location.pathname}</p>
      </aside>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  );
}
