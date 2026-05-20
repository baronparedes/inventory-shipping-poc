import {useMemo} from "react";
import {Link} from "react-router-dom";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StoreRecentCustomerOrders() {
  const {customerOrders, selectedStoreId} = usePrototypeState();
  const defaultStore = getStoreById(selectedStoreId) ?? stores[0];

  const recentOrders = useMemo(
    () => customerOrders.filter(order => order.storeId === defaultStore.id).slice(0, 20),
    [customerOrders, defaultStore.id],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch Workflow</p>
          <h2>Customer Medication Order History</h2>
          <p className="muted-copy">
            Review completed customer medication orders for this branch.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Order History</h3>
          <Link className="text-link" to="/app/store/customer-orders">
            Create Customer Order
          </Link>
        </div>

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Rx Ref</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Served At</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length ? (
              recentOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.orderRef}</td>
                  <td>
                    {order.items
                      .map(
                        item =>
                          `${getProductById(item.productId)?.name} (${item.quantity})`,
                      )
                      .join(", ")}
                  </td>
                  <td>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
                  <td>{order.servedAt}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No customer orders served yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}
