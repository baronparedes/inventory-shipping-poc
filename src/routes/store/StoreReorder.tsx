import {useMemo, useState} from "react";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

interface RefillFormItem {
  include: boolean;
  requestedQty: number;
}

export function StoreReorder() {
  const {
    storeInventory,
    reorderRequests,
    shippingOrders,
    createReorderRequest,
    selectedStoreId,
  } = usePrototypeState();
  const activeStore = getStoreById(selectedStoreId) ?? stores[0];
  const [feedback, setFeedback] = useState("");

  const lowStockRows = useMemo(
    () =>
      storeInventory
        .filter(item => {
          if (item.storeId !== activeStore.id) return false;
          const product = getProductById(item.productId);
          return product ? item.onHand <= product.reorderThreshold : false;
        })
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [storeInventory, activeStore.id],
  );

  const [formItems, setFormItems] = useState<Record<string, RefillFormItem>>({});

  const requestHistory = useMemo(
    () =>
      reorderRequests
        .filter(request => request.storeId === activeStore.id)
        .map(request => ({
          ...request,
          shipment: shippingOrders.find(shipment => shipment.requestId === request.id),
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reorderRequests, shippingOrders, activeStore.id],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch Workflow</p>
          <h2>Create Refill Request</h2>
          <p className="muted-copy">
            Raise a replenishment request to central distribution when branch stock drops.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Low Stock Refill Builder</h3>
          <span className="status-badge warning">Refill Request Ready</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Include</th>
              <th>Item</th>
              <th>On Hand</th>
              <th>Threshold</th>
              <th>Suggested Qty</th>
            </tr>
          </thead>
          <tbody>
            {lowStockRows.map(row => {
              const suggestedQty = (row.product?.reorderThreshold ?? 0) * 2;
              const rowState = formItems[row.productId] ?? {
                include: true,
                requestedQty: Math.max(1, suggestedQty),
              };

              return (
                <tr key={row.productId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={rowState.include}
                      onChange={event => {
                        setFormItems(previous => ({
                          ...previous,
                          [row.productId]: {
                            ...rowState,
                            include: event.target.checked,
                          },
                        }));
                      }}
                    />
                  </td>
                  <td>{row.product?.name}</td>
                  <td>{row.onHand}</td>
                  <td>{row.product?.reorderThreshold}</td>
                  <td>
                    <input
                      type="number"
                      value={rowState.requestedQty}
                      min={1}
                      onChange={event => {
                        const parsedValue = Number(event.target.value);
                        const nextQty =
                          Number.isFinite(parsedValue) && parsedValue > 0
                            ? Math.floor(parsedValue)
                            : 1;

                        setFormItems(previous => ({
                          ...previous,
                          [row.productId]: {
                            ...rowState,
                            requestedQty: nextQty,
                          },
                        }));
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {feedback && <div className="preview-banner">{feedback}</div>}

        <div className="actions-row">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              const requestItems = lowStockRows
                .map(row => {
                  const suggestedQty = (row.product?.reorderThreshold ?? 0) * 2;
                  const rowState = formItems[row.productId] ?? {
                    include: true,
                    requestedQty: Math.max(1, suggestedQty),
                  };
                  if (!rowState.include) return null;

                  return {
                    productId: row.productId,
                    requestedQty: Math.max(1, Math.floor(rowState.requestedQty)),
                  };
                })
                .filter(item => item !== null);

              if (requestItems.length === 0) {
                setFeedback("Select at least one item and enter a valid quantity.");
                return;
              }

              const createdId = createReorderRequest({
                storeId: activeStore.id,
                priority: "High",
                status: "Pending",
                items: requestItems,
              });
              setFeedback(`Refill request ${createdId} submitted and persisted.`);
            }}
          >
            Submit to Distribution
          </button>
        </div>
      </article>

      <article className="card">
        <h3>Refill and Dispatch History</h3>
        <p className="muted-copy">
          Track each request from branch submission through dispatch and delivery stages.
        </p>

        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Created</th>
              <th>Priority</th>
              <th>Request Status</th>
              <th>Dispatch ID</th>
              <th>Dispatch Status</th>
              <th>ETA</th>
            </tr>
          </thead>
          <tbody>
            {requestHistory.length ? (
              requestHistory.map(request => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.createdAt}</td>
                  <td>{request.priority}</td>
                  <td>{request.status}</td>
                  <td>{request.shipment?.id ?? "Not dispatched"}</td>
                  <td>{request.shipment?.status ?? "Pending dispatch"}</td>
                  <td>{request.shipment?.eta ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No refill requests created for this branch yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}
