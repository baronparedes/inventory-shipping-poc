import {useMemo, useState} from "react";
import {getProductById, getStoreInventory, stores} from "../../mocks/mockData";

const defaultStore = stores[0];

export function StoreInventory() {
  const [adjustmentType, setAdjustmentType] = useState<"IN" | "OUT">("OUT");
  const [adjustmentQty, setAdjustmentQty] = useState(5);
  const [selectedProductId, setSelectedProductId] = useState("prd-rice");

  const inventoryRows = useMemo(
    () =>
      getStoreInventory(defaultStore.id)
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Store Workflow</p>
          <h2>Inventory In and Out</h2>
          <p className="muted-copy">
            Track inbound receiving and outbound consumption for each stock item.
          </p>
        </div>
      </header>

      <div className="inventory-layout">
        <article className="card">
          <h3>Movement Snapshot</h3>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>On Hand</th>
                <th>Weekly Outflow</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map(row => (
                <tr key={row.productId}>
                  <td>{row.product?.sku}</td>
                  <td>{row.product?.name}</td>
                  <td>{row.onHand}</td>
                  <td>{row.weeklyOutflow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Record Item Movement</h3>
          <p className="muted-copy">UI-only interaction for prototype walkthroughs.</p>

          <div className="form-grid">
            <label>
              Product
              <select
                value={selectedProductId}
                onChange={event => setSelectedProductId(event.target.value)}
              >
                {inventoryRows.map(row => (
                  <option key={row.productId} value={row.productId}>
                    {row.product?.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Movement Type
              <select
                value={adjustmentType}
                onChange={event => setAdjustmentType(event.target.value as "IN" | "OUT")}
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                min={1}
                value={adjustmentQty}
                onChange={event => setAdjustmentQty(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="preview-banner">
            Preview: {adjustmentType} {adjustmentQty} units of{" "}
            {getProductById(selectedProductId)?.name}
          </div>

          <button type="button" className="primary-btn">
            Save Movement
          </button>
        </article>
      </div>
    </section>
  );
}
