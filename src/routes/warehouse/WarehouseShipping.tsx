import {useMemo, useState} from "react";
import {
  getProductById,
  getStoreById,
  reorderRequests,
  shippingOrders,
} from "../../mocks/mockData";

export function WarehouseShipping() {
  const pendingRequestIds = reorderRequests
    .filter(request => request.status === "Pending")
    .map(request => request.id);

  const [selectedRequestId, setSelectedRequestId] = useState(
    pendingRequestIds[0] ?? reorderRequests[0].id,
  );

  const selectedRequest = useMemo(
    () => reorderRequests.find(request => request.id === selectedRequestId),
    [selectedRequestId],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Warehouse Workflow</p>
          <h2>Create Shipping Order</h2>
          <p className="muted-copy">
            Convert approved or pending reorder requests into outbound shipments.
          </p>
        </div>
      </header>

      <div className="inventory-layout">
        <article className="card">
          <h3>Request Selection</h3>
          <label>
            Reorder Request
            <select
              value={selectedRequestId}
              onChange={event => setSelectedRequestId(event.target.value)}
            >
              {reorderRequests.map(request => (
                <option key={request.id} value={request.id}>
                  {request.id} | {getStoreById(request.storeId)?.name}
                </option>
              ))}
            </select>
          </label>

          <div className="preview-banner">
            Destination: {getStoreById(selectedRequest?.storeId ?? "")?.name}
          </div>

          <h4>Items to Pack</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Requested Qty</th>
                <th>Pack Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedRequest?.items.map(item => {
                const product = getProductById(item.productId);
                return (
                  <tr key={item.productId}>
                    <td>{product?.sku}</td>
                    <td>{product?.name}</td>
                    <td>{item.requestedQty}</td>
                    <td>
                      <input type="number" min={1} defaultValue={item.requestedQty} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="actions-row">
            <button type="button" className="secondary-btn">
              Save Draft Order
            </button>
            <button type="button" className="primary-btn">
              Confirm Shipment
            </button>
          </div>
        </article>

        <article className="card">
          <h3>Current Shipping Queue</h3>
          <ul className="shipment-list">
            {shippingOrders.map(order => (
              <li key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <p>
                    {getStoreById(order.storeId)?.name} | ETA {order.eta}
                  </p>
                </div>
                <span className="status-badge warning">{order.status}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
