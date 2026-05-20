import {Link} from "react-router-dom";
import {getLowStockItems, getProductById, getStoreById, stores} from "../../mocks/mockData";

const focusStore = stores[0];

export function StoreDashboard() {
  const lowStockItems = getLowStockItems(focusStore.id);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Store View</p>
          <h2>{focusStore.name} Stock Pulse</h2>
          <p className="muted-copy">
            Manager: {getStoreById(focusStore.id)?.manager} | City: {focusStore.city}
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="card kpi-card">
          <span className="kpi-label">Low Stock SKUs</span>
          <p className="kpi-value">{lowStockItems.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Items Tracked</span>
          <p className="kpi-value">6</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Weekly Outflow</span>
          <p className="kpi-value">62 units</p>
        </article>
      </div>

      <article className="card">
        <div className="table-header">
          <h3>Immediate Reorder Candidates</h3>
          <Link className="text-link" to="/app/store/reorder">
            Open Reorder Form
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>On Hand</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map(item => {
              const product = getProductById(item.productId);
              if (!product) return null;

              return (
                <tr key={item.productId}>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{item.onHand}</td>
                  <td>{product.reorderThreshold}</td>
                  <td>
                    <span className="status-badge critical">Low</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
}
