import {useEffect, useMemo, useState} from "react";
import {getProductById, getStoreById} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function WarehouseShipping() {
  const {reorderRequests, shippingOrders, createShippingOrder, updateShippingStatus} =
    usePrototypeState();
  const [feedback, setFeedback] = useState("");
  const [isCreateDispatchModalOpen, setIsCreateDispatchModalOpen] = useState(false);
  const [isConfirmDispatchModalOpen, setIsConfirmDispatchModalOpen] = useState(false);

  const requestIdsWithDispatch = useMemo(
    () => new Set(shippingOrders.map(order => order.requestId)),
    [shippingOrders],
  );

  const refillRequests = useMemo(
    () =>
      reorderRequests.filter(
        request =>
          (request.status === "Pending" || request.status === "Approved") &&
          !requestIdsWithDispatch.has(request.id),
      ),
    [reorderRequests, requestIdsWithDispatch],
  );

  const [rawSelectedRequestId, setSelectedRequestId] = useState(
    refillRequests[0]?.id ?? reorderRequests[0]?.id ?? "",
  );

  const selectedRequestId = refillRequests.some(
    request => request.id === rawSelectedRequestId,
  )
    ? rawSelectedRequestId
    : (refillRequests[0]?.id ?? reorderRequests[0]?.id ?? "");

  const selectedRequest = useMemo(
    () => refillRequests.find(request => request.id === selectedRequestId),
    [refillRequests, selectedRequestId],
  );

  const activeDispatchQueue = useMemo(
    () =>
      shippingOrders.filter(
        order =>
          order.status === "Draft" ||
          order.status === "Packed" ||
          order.status === "In Transit",
      ),
    [shippingOrders],
  );

  const dispatchOrderHistory = useMemo(
    () => shippingOrders.filter(order => order.status === "Delivered"),
    [shippingOrders],
  );

  const refillRequestHistory = useMemo(
    () => reorderRequests.filter(request => request.status === "Fulfilled"),
    [reorderRequests],
  );

  useEffect(() => {
    if (!isCreateDispatchModalOpen && !isConfirmDispatchModalOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isConfirmDispatchModalOpen) {
          setIsConfirmDispatchModalOpen(false);
          return;
        }
        setIsCreateDispatchModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isCreateDispatchModalOpen, isConfirmDispatchModalOpen]);

  useEffect(() => {
    console.log("Reorder Requests updated:", reorderRequests);
    console.log("Shipping Orders updated:", shippingOrders);
  }, [reorderRequests, shippingOrders]);

  return (
    <section className="section-spacing">
      <header className="section-head">
        <div>
          <p className="eyebrow">Central Distribution Workflow</p>
          <h2>Create Dispatch Order</h2>
          <p className="muted-copy">
            Convert approved or pending refill requests into outbound branch dispatches.
          </p>
        </div>
      </header>

      <article className="card">
        <h3>Refill Requests</h3>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Branch</th>
              <th>Created</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Items</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {refillRequests.length ? (
              refillRequests.map(request => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{getStoreById(request.storeId)?.name}</td>
                  <td>{request.createdAt}</td>
                  <td>{request.priority}</td>
                  <td>{request.status}</td>
                  <td>{request.items.length}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setIsCreateDispatchModalOpen(true);
                      }}
                    >
                      Create Dispatch
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No pending refill requests available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <div className="section-spacing"></div>

      <article className="card">
        <h3>Current Dispatch Queue</h3>
        <table>
          <thead>
            <tr>
              <th>Dispatch ID</th>
              <th>Destination Branch</th>
              <th>Ship Date</th>
              <th>ETA</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeDispatchQueue.length ? (
              activeDispatchQueue.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{getStoreById(order.storeId)?.name}</td>
                  <td>{order.shipDate}</td>
                  <td>{order.eta}</td>
                  <td>{order.items.length}</td>
                  <td>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        order.status === "Packed" || order.status === "In Transit"
                          ? "warning"
                          : "healthy"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    {order.status === "Packed" ? (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const updatedId = updateShippingStatus(order.id, "In Transit");
                          if (updatedId) {
                            setFeedback(
                              `Dispatch ${updatedId} status updated to In Transit.`,
                            );
                          }
                        }}
                      >
                        Mark In Transit
                      </button>
                    ) : (
                      <span className="muted-copy">-</span>
                    )}
                    {order.status === "Draft" && (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          const updatedId = updateShippingStatus(order.id, "Packed");
                          if (updatedId) {
                            setFeedback(`Dispatch ${updatedId} status updated to Packed.`);
                          }
                        }}
                      >
                        Mark Packed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No active dispatches in queue.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <div className="section-spacing"></div>

      <article className="card">
        <h3>Order History</h3>

        <h4>Dispatch Order History</h4>
        <table>
          <thead>
            <tr>
              <th>Dispatch ID</th>
              <th>Destination Branch</th>
              <th>Ship Date</th>
              <th>ETA</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dispatchOrderHistory.length ? (
              dispatchOrderHistory.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{getStoreById(order.storeId)?.name}</td>
                  <td>{order.shipDate}</td>
                  <td>{order.eta}</td>
                  <td>{order.items.length}</td>
                  <td>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
                  <td>
                    <span className="status-badge healthy">{order.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No completed dispatch history yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4>Refill Request History</h4>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Branch</th>
              <th>Created</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {refillRequestHistory.length ? (
              refillRequestHistory.map(request => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{getStoreById(request.storeId)?.name}</td>
                  <td>{request.createdAt}</td>
                  <td>{request.priority}</td>
                  <td>
                    <span className="status-badge healthy">{request.status}</span>
                  </td>
                  <td>{request.items.length}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No fulfilled refill requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {isConfirmDispatchModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsConfirmDispatchModalOpen(false)}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="table-header">
              <h3>Confirm Dispatch</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsConfirmDispatchModalOpen(false)}
              >
                Close
              </button>
            </div>

            <p className="muted-copy">
              You are about to confirm and pack this dispatch order.
            </p>

            <div className="preview-banner">
              Request: {selectedRequest?.id ?? "None"} | Destination:{" "}
              {getStoreById(selectedRequest?.storeId ?? "")?.name ?? "None selected"}
            </div>

            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Medication</th>
                  <th>Requested Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedRequest?.items.length ? (
                  selectedRequest.items.map(item => {
                    const product = getProductById(item.productId);
                    return (
                      <tr key={item.productId}>
                        <td>{product?.sku}</td>
                        <td>{product?.name}</td>
                        <td>{item.requestedQty}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3}>No request selected.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsConfirmDispatchModalOpen(false)}
              >
                No
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!selectedRequest}
                onClick={() => {
                  if (!selectedRequest) return;
                  const createdId = createShippingOrder({
                    requestId: selectedRequest.id,
                    status: "Packed",
                  });
                  if (createdId) {
                    setFeedback(`Dispatch ${createdId} confirmed and persisted.`);
                  }
                  setIsConfirmDispatchModalOpen(false);
                  setIsCreateDispatchModalOpen(false);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateDispatchModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            setIsCreateDispatchModalOpen(false);
            setIsConfirmDispatchModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="table-header">
              <h3>Create Dispatch From Selected Request</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setIsCreateDispatchModalOpen(false);
                  setIsConfirmDispatchModalOpen(false);
                }}
              >
                Close
              </button>
            </div>

            <label>
              Refill Request Source
              <select
                value={selectedRequestId}
                onChange={event => setSelectedRequestId(event.target.value)}
              >
                {refillRequests.length ? (
                  refillRequests.map(request => (
                    <option key={request.id} value={request.id}>
                      {request.id} - {getStoreById(request.storeId)?.name} (
                      {request.items.length} items)
                    </option>
                  ))
                ) : (
                  <option value="">No refill requests available</option>
                )}
              </select>
            </label>

            <div className="preview-banner">
              Destination:{" "}
              {getStoreById(selectedRequest?.storeId ?? "")?.name ?? "None selected"}
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
                {selectedRequest?.items.length ? (
                  selectedRequest.items.map(item => {
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
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>Select a refill request to prepare dispatch items.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {feedback && <div className="preview-banner">{feedback}</div>}

            <div className="actions-row">
              <button
                type="button"
                className="secondary-btn"
                disabled={!selectedRequest}
                onClick={() => {
                  if (!selectedRequest) return;
                  const createdId = createShippingOrder({
                    requestId: selectedRequest.id,
                    status: "Draft",
                  });
                  if (createdId) {
                    setFeedback(`Draft dispatch order ${createdId} saved locally.`);
                    setIsCreateDispatchModalOpen(false);
                    setIsConfirmDispatchModalOpen(false);
                  }
                }}
              >
                Save Draft Order
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!selectedRequest}
                onClick={() => {
                  if (!selectedRequest) return;
                  setIsCreateDispatchModalOpen(false);
                  setIsConfirmDispatchModalOpen(true);
                }}
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
