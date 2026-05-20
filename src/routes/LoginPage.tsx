import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {usePrototypeState} from "../state/usePrototypeState";
import type {Role} from "../types/domain";

export function LoginPage() {
  const navigate = useNavigate();
  const {preferredRole, setPreferredRole} = usePrototypeState();
  const [role, setRole] = useState<Role>(preferredRole);

  return (
    <section className="login-wrap">
      <p className="eyebrow">Route-Based Access</p>
      <h1>Mock Login</h1>
      <p className="muted-copy">
        Choose a role to enter the pharmacy prototype by route. You can still switch roles
        inside the app using the role switch control.
      </p>

      <div className="card login-card">
        <label htmlFor="role-select">Sign in as</label>
        <select
          id="role-select"
          value={role}
          onChange={event => setRole(event.target.value as Role)}
        >
          <option value="store">Pharmacy Branch User</option>
          <option value="warehouse">Distribution Planner</option>
        </select>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setPreferredRole(role);
            navigate(`/app/${role}/dashboard`);
          }}
        >
          Continue to Dashboard
        </button>
      </div>
    </section>
  );
}
