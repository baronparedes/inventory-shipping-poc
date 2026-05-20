import {NavLink, Outlet, useLocation, useNavigate} from "react-router-dom";
import type {Role} from "../types/domain";

interface AppShellProps {
  role: Role;
}

const roleTitles: Record<Role, string> = {
  store: "Store Console",
  warehouse: "Warehouse Console",
};

const roleDescriptions: Record<Role, string> = {
  store: "Track stock movement, detect shortages, and request replenishment.",
  warehouse: "Monitor all stores, prioritize shortages, and prepare shipments.",
};

const navLinks: Record<Role, Array<{path: string; label: string}>> = {
  store: [
    {path: "/app/store/dashboard", label: "Dashboard"},
    {path: "/app/store/inventory", label: "Inventory In/Out"},
    {path: "/app/store/reorder", label: "Reorder Stock"},
  ],
  warehouse: [
    {path: "/app/warehouse/dashboard", label: "Dashboard"},
    {path: "/app/warehouse/monitor", label: "Store Monitoring"},
    {path: "/app/warehouse/shipping", label: "Shipping Orders"},
  ],
};

export function AppShell({role}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <p className="eyebrow">Inventory + Shipping Prototype</p>
        <h1>{roleTitles[role]}</h1>
        <p className="muted-copy">{roleDescriptions[role]}</p>

        <div className="role-switch">
          <label htmlFor="role-picker">Role Switch</label>
          <select
            id="role-picker"
            value={role}
            onChange={event => {
              const selectedRole = event.target.value as Role;
              navigate(`/app/${selectedRole}/dashboard`);
            }}
          >
            <option value="store">Store</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>

        <nav className="main-nav" aria-label="Main sections">
          {navLinks[role].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({isActive}) => (isActive ? "nav-item active" : "nav-item")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="route-hint">Active Route: {location.pathname}</p>
      </aside>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  );
}
