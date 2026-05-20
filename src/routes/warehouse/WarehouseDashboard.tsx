import {Link} from "react-router-dom";
import {getStoreById, reorderRequests, shippingOrders, stores} from "../../mocks/mockData";

export function WarehouseDashboard() {
  const pendingRequests = reorderRequests.filter(request => request.status === "Pending");

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Warehouse View</p>
          <h2>Network Stock Overview</h2>
          <p className="muted-copy">
            Monitor all stores, prioritize shortages, and dispatch replenishment shipments.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="card kpi-card">
          <span className="kpi-label">Stores Connected</span>
          <p className="kpi-value">{stores.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Pending Reorders</span>
          <p className="kpi-value">{pendingRequests.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Open Shipments</span>
          <p className="kpi-value">{shippingOrders.length}</p>
        </article>
      </div>

      <article className="card">
        <div className="table-header">
          <h3>Requests Awaiting Fulfillment</h3>
          <Link className="text-link" to="/app/warehouse/shipping">
            Create Shipping Order
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Store</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map(request => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td>{getStoreById(request.storeId)?.name}</td>
                <td>
                  <span className="status-badge critical">{request.priority}</span>
                </td>
                <td>{request.createdAt}</td>
                <td>{request.items.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
