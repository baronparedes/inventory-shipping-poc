import {useMemo, useState} from "react";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

interface DraftOrderItem {
  productId: string;
  quantity: number;
}

export function StoreCustomerOrders() {
  const {storeInventory, serveCustomerOrder, selectedStoreId} = usePrototypeState();
  const defaultStore = getStoreById(selectedStoreId) ?? stores[0];
  const [adjustmentQty, setAdjustmentQty] = useState(5);
  const [selectedProductId, setSelectedProductId] = useState("prd-rice");
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [feedback, setFeedback] = useState("");

  const inventoryRows = useMemo(
    () =>
      storeInventory
        .filter(item => item.storeId === defaultStore.id)
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [storeInventory, defaultStore.id],
  );

  const totalDraftUnits = draftOrderItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch Workflow</p>
          <h2>Customer Medication Orders</h2>
          <p className="muted-copy">
            Serve customers, capture order details, and dispense multiple medications in one
            order.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Create Customer Order</h3>
        </div>

        <div className="form-grid">
          <label>
            Customer Name
            <input
              type="text"
              value={customerName}
              onChange={event => setCustomerName(event.target.value)}
              placeholder="e.g. Alicia Morgan"
            />
          </label>

          <label>
            Order / Rx Number
            <input
              type="text"
              value={orderRef}
              onChange={event => setOrderRef(event.target.value)}
              placeholder="e.g. RX-44823"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Medication
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
            Unit Count
            <input
              type="number"
              min={1}
              value={adjustmentQty}
              onChange={event => setAdjustmentQty(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="actions-row" style={{justifyContent: "flex-start"}}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              if (adjustmentQty < 1) {
                setFeedback("Unit Count must be at least 1.");
                return;
              }

              setDraftOrderItems(previous => {
                const existing = previous.find(
                  item => item.productId === selectedProductId,
                );

                if (!existing) {
                  return [
                    ...previous,
                    {productId: selectedProductId, quantity: adjustmentQty},
                  ];
                }

                return previous.map(item =>
                  item.productId === selectedProductId
                    ? {...item, quantity: item.quantity + adjustmentQty}
                    : item,
                );
              });
              setFeedback("Medication added to customer order.");
            }}
          >
            Add Item to Order
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Qty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {draftOrderItems.length ? (
              draftOrderItems.map(item => (
                <tr key={item.productId}>
                  <td>{getProductById(item.productId)?.name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setDraftOrderItems(previous =>
                          previous.filter(row => row.productId !== item.productId),
                        );
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No items in this customer order yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="preview-banner">
          {`Preview: Dispense ${totalDraftUnits} total units (${draftOrderItems.length} items) to ${
            customerName || "<Customer Name>"
          } (${orderRef || "<Order Ref>"})`}
        </div>

        {feedback && <div className="preview-banner">{feedback}</div>}

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (!customerName.trim() || !orderRef.trim()) {
              setFeedback("Customer Name and Order/Rx Number are required.");
              return;
            }

            if (!draftOrderItems.length) {
              setFeedback("Add at least one medication item to the customer order.");
              return;
            }

            const createdId = serveCustomerOrder({
              storeId: defaultStore.id,
              customerName,
              orderRef,
              items: draftOrderItems,
            });

            if (!createdId) {
              setFeedback("Unable to save order. Check available stock and quantities.");
              return;
            }

            setFeedback(`Customer order ${createdId} saved and inventory updated.`);
            setCustomerName("");
            setOrderRef("");
            setDraftOrderItems([]);
          }}
        >
          Complete Customer Order
        </button>
      </article>
    </section>
  );
}
