import {Link} from "react-router-dom";
import {stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";
import {useState} from "react";
import Modal from "../../components/Modal";
import {getProductById} from "../../mocks/mockData";
import type {ReorderRequest} from "../../types/domain";

export function WarehouseDashboard() {
  const {reorderRequests, shippingOrders} = usePrototypeState();
  const [selectedRequest, setSelectedRequest] = useState<ReorderRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedShippingOrder = selectedRequest
    ? shippingOrders.find(order => order.requestId === selectedRequest.id)
    : null;

  const shippingStatusMap = new Map(
    shippingOrders.map(order => [order.requestId, order.status]),
  );

  const branchNameMap = new Map(stores.map(store => [store.id, store.name]));

  const handleRowClick = (request: ReorderRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Central Distribution View</p>
          <h2>Pharmacy Network Stock Overview</h2>
          <p className="muted-copy">
            Monitor all branches, prioritize medication shortages, and dispatch
            replenishment shipments.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <article className="card kpi-card">
          <span className="kpi-label">Branches Connected</span>
          <p className="kpi-value">{stores.length}</p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Pending Refill Requests</span>
          <p className="kpi-value">
            {reorderRequests.filter(request => request.status === "Pending").length}
          </p>
        </article>
        <article className="card kpi-card">
          <span className="kpi-label">Open Shipments</span>
          <p className="kpi-value">{shippingOrders.length}</p>
        </article>
      </div>
      <article className="card">
        <div className="table-header">
          <h3>Refill Requests Awaiting Fulfillment</h3>
          <Link className="text-link" to="/app/warehouse/shipping">
            View All
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Branch Name</th>
              <th>Priority</th>
              <th>Created At</th>
              <th>Shipping ID</th>
              <th>Shipping Status</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {reorderRequests.map(request => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td>{branchNameMap.get(request.storeId) || "Unknown Branch"}</td>
                <td>{request.priority}</td>
                <td>{request.createdAt}</td>
                <td>
                  {shippingOrders.find(order => order.requestId === request.id)?.id ||
                    "Not Dispatched"}
                </td>
                <td>{shippingStatusMap.get(request.id) || "Not Dispatched"}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleRowClick(request)}
                    className="secondary-btn"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
      {isModalOpen && selectedRequest && (
        <Modal onClose={closeModal}>
          <h3>Refill Request Details</h3>

          <div className="form-grid">
            <p>
              <strong>Request ID:</strong> {selectedRequest.id}
            </p>
            <p>
              <strong>Branch Name:</strong>{" "}
              {branchNameMap.get(selectedRequest.storeId) || "Unknown Branch"}
            </p>
            <p>
              <strong>Priority:</strong> {selectedRequest.priority}
            </p>
            <p>
              <strong>Created At:</strong> {selectedRequest.createdAt}
            </p>
            <p>
              <strong>Request Status:</strong> {selectedRequest.status}
            </p>
            <p>
              <strong>Total Requested Units:</strong>{" "}
              {selectedRequest.items.reduce((total, item) => total + item.requestedQty, 0)}
            </p>
          </div>

          <h4>Shipping Details</h4>
          {selectedShippingOrder ? (
            <div className="form-grid">
              <p>
                <strong>Shipping ID:</strong> {selectedShippingOrder.id}
              </p>
              <p>
                <strong>Shipping Status:</strong> {selectedShippingOrder.status}
              </p>
              <p>
                <strong>Ship Date:</strong> {selectedShippingOrder.shipDate}
              </p>
              <p>
                <strong>ETA:</strong> {selectedShippingOrder.eta}
              </p>
              <p>
                <strong>Items in Shipment:</strong> {selectedShippingOrder.items.length}
              </p>
              <p>
                <strong>Total Shipped Units:</strong>{" "}
                {selectedShippingOrder.items.reduce(
                  (total, item) => total + item.quantity,
                  0,
                )}
              </p>
            </div>
          ) : (
            <p className="muted-copy">
              No shipping order has been created for this request.
            </p>
          )}

          <h4>Requested Items</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Medication</th>
                <th>Requested Qty</th>
                <th>Shipped Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedRequest.items.map(item => {
                const product = getProductById(item.productId);
                const shippedQty =
                  selectedShippingOrder?.items.find(
                    shippingItem => shippingItem.productId === item.productId,
                  )?.quantity ?? 0;

                return (
                  <tr key={item.productId}>
                    <td>{product?.sku || "-"}</td>
                    <td>{product?.name || item.productId}</td>
                    <td>{item.requestedQty}</td>
                    <td>{shippedQty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}
    </section>
  );
}
