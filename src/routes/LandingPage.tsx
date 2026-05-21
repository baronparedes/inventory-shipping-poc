import {Link} from "react-router-dom";
import {usePrototypeState} from "../state/usePrototypeState";

export function LandingPage() {
  const {preferredRole} = usePrototypeState();

  return (
    <section className="landing-wrap">
      <div className="floating-shape"></div>
      <p className="eyebrow">Welcome</p>
      <h1>Pharmacy Inventory and Dispatch Control Tower</h1>
      <p className="muted-copy landing-copy">
        Manage how pharmacy branches track medication movement, request replenishment, and
        how central distribution teams monitor all branches before creating dispatch plans.
      </p>

      <div className="landing-actions">
        <Link className="primary-btn" to="/login">
          Sign In
        </Link>
        <Link className="secondary-btn" to={`/app/${preferredRole}/dashboard`}>
          Continue as Last Role
        </Link>
        <Link className="secondary-btn" to="/app/warehouse/dashboard">
          Jump to Distribution View
        </Link>
        <Link className="secondary-btn" to="/app/stakeholder/dashboard">
          Jump to Stakeholder View
        </Link>
      </div>
    </section>
  );
}
