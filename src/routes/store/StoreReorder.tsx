import {useMemo} from "react";
import {getLowStockItems, getProductById, stores} from "../../mocks/mockData";

const activeStore = stores[0];

export function StoreReorder() {
  const lowStockRows = useMemo(
    () =>
      getLowStockItems(activeStore.id)
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Store Workflow</p>
          <h2>Create Reorder Request</h2>
          <p className="muted-copy">
            Raise a stock replenishment request to the warehouse when inventory drops.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Low Stock Request Builder</h3>
          <span className="status-badge warning">Draft Request</span>
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

        <div className="actions-row">
          <button type="button" className="secondary-btn">
            Save as Draft
          </button>
          <button type="button" className="primary-btn">
            Submit to Warehouse
          </button>
        </div>
      </article>
    </section>
  );
}
