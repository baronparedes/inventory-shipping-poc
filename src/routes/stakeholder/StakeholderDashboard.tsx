import {useMemo} from "react";
import {Link} from "react-router-dom";
import {getProductById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StakeholderDashboard() {
  const {
    storeInventory,
    reorderRequests,
    shippingOrders,
    customerOrders,
    inventoryTransactions,
  } = usePrototypeState();

  const lowStockCount = useMemo(
    () =>
      storeInventory.filter(item => {
        const product = getProductById(item.productId);
        return product ? item.onHand <= product.reorderThreshold : false;
      }).length,
    [storeInventory],
  );

  const pendingRefills = useMemo(
    () => reorderRequests.filter(request => request.status !== "Fulfilled").length,
    [reorderRequests],
  );

  const inTransitShipments = useMemo(
    () => shippingOrders.filter(order => order.status === "In Transit").length,
    [shippingOrders],
  );

  const weeklyServedUnits = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return customerOrders
      .filter(order => new Date(order.servedAt) >= cutoff)
      .flatMap(order => order.items)
      .reduce((acc, item) => acc + item.quantity, 0);
  }, [customerOrders]);

  const topMovingProducts = useMemo(() => {
    const movementByProduct = inventoryTransactions.reduce(
      (acc, transaction) => {
        acc[transaction.productId] =
          (acc[transaction.productId] ?? 0) + transaction.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(movementByProduct)
      .map(([productId, quantity]) => ({
        productId,
        quantity,
        product: getProductById(productId),
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [inventoryTransactions]);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Stakeholder View</p>
          <h2>Network Operations Snapshot</h2>
          <p className="muted-copy">
            Read-only overview of movement, fulfillment, and service pressure across all
            branches.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="card kpi-card">
          <span className="kpi-label">Connected Branches</span>
          <p className="kpi-value">{stores.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Low Stock Rows</span>
          <p className="kpi-value">{lowStockCount}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Pending Refill Requests</span>
          <p className="kpi-value">{pendingRefills}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">In-Transit Shipments</span>
          <p className="kpi-value">{inTransitShipments}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">7-Day Served Units</span>
          <p className="kpi-value">{weeklyServedUnits}</p>
        </article>
      </div>

      <article className="card">
        <div className="table-header">
          <h3>Top Moving Medications</h3>
          <Link className="text-link" to="/app/stakeholder/reports">
            Open Movement Report
          </Link>
        </div>

        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Medication</th>
              <th>Total Moved Units</th>
            </tr>
          </thead>
          <tbody>
            {topMovingProducts.length ? (
              topMovingProducts.map(row => (
                <tr key={row.productId}>
                  <td>{row.product?.sku ?? row.productId}</td>
                  <td>{row.product?.name ?? row.productId}</td>
                  <td>{row.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No movement data available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}
