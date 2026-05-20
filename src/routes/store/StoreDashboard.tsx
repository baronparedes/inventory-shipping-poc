import {useMemo} from "react";
import {Link} from "react-router-dom";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StoreDashboard() {
  const {storeInventory, customerOrders, selectedStoreId} = usePrototypeState();
  const focusStore = getStoreById(selectedStoreId) ?? stores[0];

  const lowStockItems = storeInventory.filter(item => {
    if (item.storeId !== focusStore.id) return false;
    const product = getProductById(item.productId);
    return product ? item.onHand <= product.reorderThreshold : false;
  });

  const weeklyDispenseVolume = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return customerOrders
      .filter(order => order.storeId === focusStore.id)
      .filter(order => new Date(order.servedAt) >= cutoff)
      .flatMap(order => order.items)
      .reduce((acc, item) => acc + item.quantity, 0);
  }, [customerOrders, focusStore.id]);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch View</p>
          <h2>{focusStore.name} Medication Stock Pulse</h2>
          <p className="muted-copy">
            Pharmacist Lead: {getStoreById(focusStore.id)?.manager} | City:{" "}
            {focusStore.city}
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="card kpi-card">
          <span className="kpi-label">Low Stock Medication SKUs</span>
          <p className="kpi-value">{lowStockItems.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Items Tracked</span>
          <p className="kpi-value">6</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Weekly Dispense Volume</span>
          <p className="kpi-value">{weeklyDispenseVolume} units</p>
        </article>
      </div>

      <article className="card">
        <div className="table-header">
          <h3>Immediate Refill Candidates</h3>
          <Link className="text-link" to="/app/store/reorder">
            Open Refill Request Form
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
