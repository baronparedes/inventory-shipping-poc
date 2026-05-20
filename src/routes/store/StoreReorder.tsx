import {useMemo, useState} from "react";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StoreReorder() {
  const {storeInventory, createReorderRequest, selectedStoreId} = usePrototypeState();
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

  const requestItems = lowStockRows.map(row => ({
    productId: row.productId,
    requestedQty: (row.product?.reorderThreshold ?? 0) * 2,
  }));

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

              return (
                <tr key={row.productId}>
                  <td>
                    <input type="checkbox" defaultChecked />
                  </td>
                  <td>{row.product?.name}</td>
                  <td>{row.onHand}</td>
                  <td>{row.product?.reorderThreshold}</td>
                  <td>
                    <input type="number" defaultValue={suggestedQty} min={1} />
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
    </section>
  );
}
