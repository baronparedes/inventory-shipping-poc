import {Link} from "react-router-dom";

export function LandingPage() {
  return (
    <section className="landing-wrap">
      <div className="floating-shape"></div>
      <p className="eyebrow">Prototype Start</p>
      <h1>Inventory and Shipping Control Tower</h1>
      <p className="muted-copy landing-copy">
        This prototype simulates how stores track stock movement, request replenishment, and
        how warehouse teams monitor all stores before creating shipment plans.
      </p>

      <div className="landing-actions">
        <Link className="primary-btn" to="/login">
          Enter Via Mock Login
        </Link>
        <Link className="secondary-btn" to="/app/store/dashboard">
          Jump to Store View
        </Link>
        <Link className="secondary-btn" to="/app/warehouse/dashboard">
          Jump to Warehouse View
        </Link>
      </div>
    </section>
  );
}
