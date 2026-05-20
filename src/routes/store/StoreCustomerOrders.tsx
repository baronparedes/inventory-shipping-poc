import {useMemo, useRef, useState} from "react";
import Modal from "../../components/Modal";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

interface DraftOrderItem {
  productId: string;
  quantity: number;
}

export function StoreCustomerOrders() {
  const {storeInventory, serveCustomerOrder, selectedStoreId} = usePrototypeState();
  const defaultStore = getStoreById(selectedStoreId) ?? stores[0];
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalAddQty, setModalAddQty] = useState(5);
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [feedback, setFeedback] = useState("");
  const orderGridRef = useRef<HTMLHeadingElement | null>(null);

  const inventoryRows = useMemo(
    () =>
      storeInventory
        .filter(item => item.storeId === defaultStore.id)
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [storeInventory, defaultStore.id],
  );

  const inventoryByProductId = useMemo(
    () => new Map(inventoryRows.map(row => [row.productId, row])),
    [inventoryRows],
  );

  const filteredInventoryRows = useMemo(() => {
    const query = modalSearchQuery.trim().toLowerCase();
    if (!query) return [];

    return inventoryRows.filter(row => {
      const name = row.product?.name.toLowerCase() ?? "";
      const sku = row.product?.sku.toLowerCase() ?? "";
      return (
        name.includes(query) ||
        sku.includes(query) ||
        row.productId.toLowerCase().includes(query)
      );
    });
  }, [inventoryRows, modalSearchQuery]);

  const addItemToOrder = (productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) {
      setFeedback("Quantity must be at least 1.");
      return;
    }

    setDraftOrderItems(previous => {
      const existing = previous.find(item => item.productId === productId);
      if (!existing) {
        return [...previous, {productId, quantity: Math.floor(quantity)}];
      }

      return previous.map(item =>
        item.productId === productId
          ? {...item, quantity: item.quantity + Math.floor(quantity)}
          : item,
      );
    });

    setFeedback("Medication added to customer order.");
  };

  const updateOrderItemQuantity = (productId: string, nextQuantity: number) => {
    setDraftOrderItems(previous =>
      previous.map(rowItem =>
        rowItem.productId === productId
          ? {
              ...rowItem,
              quantity: Number.isFinite(nextQuantity)
                ? Math.max(1, Math.floor(nextQuantity))
                : rowItem.quantity,
            }
          : rowItem,
      ),
    );
  };

  const removeOrderItem = (productId: string) => {
    setDraftOrderItems(previous =>
      previous.filter(rowItem => rowItem.productId !== productId),
    );
  };

  const closeModalAndShowGrid = () => {
    setIsAddItemModalOpen(false);
    setModalSearchQuery("");
    requestAnimationFrame(() => {
      orderGridRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    });
  };

  const addTopMatch = () => {
    if (!modalSearchQuery.trim()) {
      setFeedback("Type a medication name or SKU to search first.");
      return;
    }

    const firstMatch = filteredInventoryRows[0];
    if (!firstMatch) {
      setFeedback("No matching medication found.");
      return;
    }

    addItemToOrder(firstMatch.productId, modalAddQty);
    closeModalAndShowGrid();
  };

  const completeCustomerOrder = () => {
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
  };

  const totalDraftUnits = draftOrderItems.reduce((acc, item) => acc + item.quantity, 0);
  const hasRequiredHeaderFields =
    customerName.trim().length > 0 && orderRef.trim().length > 0;

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch Workflow</p>
          <h2>Customer Medication Orders</h2>
          <p className="muted-copy">
            Fast search and inline edits for high-volume medication order entry.
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
              required
              value={customerName}
              onChange={event => setCustomerName(event.target.value)}
              placeholder="e.g. Alicia Morgan"
            />
          </label>

          <label>
            Order / Rx Number
            <input
              type="text"
              required
              value={orderRef}
              onChange={event => setOrderRef(event.target.value)}
              placeholder="e.g. RX-44823"
            />
          </label>
        </div>

        <div className="actions-row" style={{justifyContent: "flex-start"}}>
          <button
            type="button"
            className="secondary-btn"
            disabled={!hasRequiredHeaderFields}
            onClick={() => setIsAddItemModalOpen(true)}
          >
            Add Item
          </button>
        </div>

        {!hasRequiredHeaderFields ? (
          <p className="muted-copy">Customer Name and Order / Rx Number are required.</p>
        ) : null}

        <h4 ref={orderGridRef}>Order</h4>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Medication</th>
              <th>On Hand</th>
              <th>Order Qty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {draftOrderItems.length ? (
              draftOrderItems.map(item => {
                const row = inventoryByProductId.get(item.productId);
                const product = getProductById(item.productId);

                return (
                  <tr key={item.productId}>
                    <td>{product?.sku}</td>
                    <td>{product?.name}</td>
                    <td>{row?.onHand ?? 0}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={event =>
                          updateOrderItemQuantity(
                            item.productId,
                            Number(event.target.value),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => removeOrderItem(item.productId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>No items in this customer order yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="preview-banner">
          {`Order summary: ${totalDraftUnits} total units across ${draftOrderItems.length} items for ${
            customerName || "the selected customer"
          } (${orderRef || "order reference pending"})`}
        </div>

        {feedback && <div className="preview-banner">{feedback}</div>}

        <button
          type="button"
          className="primary-btn"
          disabled={!hasRequiredHeaderFields || !draftOrderItems.length}
          onClick={completeCustomerOrder}
        >
          Complete Customer Order
        </button>
      </article>

      {isAddItemModalOpen ? (
        <Modal onClose={closeModalAndShowGrid}>
          <div className="table-header">
            <h3>Add Medication to Order</h3>
          </div>

          <div className="form-grid">
            <label>
              Search Medication (SKU or name)
              <input
                type="text"
                value={modalSearchQuery}
                onChange={event => setModalSearchQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTopMatch();
                  }
                }}
                placeholder="Type to search and press Enter"
              />
            </label>

            <label>
              Add Quantity
              <input
                type="number"
                min={1}
                value={modalAddQty}
                onChange={event => setModalAddQty(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="actions-row" style={{justifyContent: "flex-start"}}>
            <button type="button" className="secondary-btn" onClick={addTopMatch}>
              Add Top Match
            </button>
            <button type="button" className="secondary-btn" onClick={closeModalAndShowGrid}>
              View Order Grid
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Medication</th>
                <th>On Hand</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventoryRows.length ? (
                filteredInventoryRows.slice(0, 8).map(row => (
                  <tr key={row.productId}>
                    <td>{row.product?.sku}</td>
                    <td>{row.product?.name}</td>
                    <td>{row.onHand}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          addItemToOrder(row.productId, modalAddQty);
                        }}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    {modalSearchQuery.trim()
                      ? "No medications match your search query."
                      : "Type to search medications. Results will appear here."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h4>Order</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Medication</th>
                <th>On Hand</th>
                <th>Order Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {draftOrderItems.length ? (
                draftOrderItems.map(item => {
                  const row = inventoryByProductId.get(item.productId);
                  const product = getProductById(item.productId);

                  return (
                    <tr key={item.productId}>
                      <td>{product?.sku}</td>
                      <td>{product?.name}</td>
                      <td>{row?.onHand ?? 0}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={event =>
                            updateOrderItemQuantity(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => removeOrderItem(item.productId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}>No items in this customer order yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Modal>
      ) : null}
    </section>
  );
}
