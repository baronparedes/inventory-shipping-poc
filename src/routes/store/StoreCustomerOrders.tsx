import {useMemo, useRef, useState} from "react";
import Modal from "../../components/Modal";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

interface DraftOrderItem {
  productId: string;
  quantity: number;
}

export function StoreCustomerOrders() {
  const {storeInventory, customerProfiles, serveCustomerOrder, selectedStoreId} =
    usePrototypeState();
  const defaultStore = getStoreById(selectedStoreId) ?? stores[0];
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalAddQty, setModalAddQty] = useState(5);
  const [draftOrderItems, setDraftOrderItems] = useState<DraftOrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [modalFeedback, setModalFeedback] = useState("");
  const [touched, setTouched] = useState({
    customerName: false,
    customerPhone: false,
    orderRef: false,
  });

  const touch = (field: keyof typeof touched) =>
    setTouched(prev => ({...prev, [field]: true}));
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

  const storeCustomers = useMemo(
    () =>
      customerProfiles
        .filter(profile => profile.preferredStoreId === defaultStore.id)
        .sort((a, b) => b.lastServedAt.localeCompare(a.lastServedAt)),
    [customerProfiles, defaultStore.id],
  );

  const addItemToOrder = (productId: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) {
      setModalFeedback("Quantity must be at least 1.");
      return;
    }

    const invRow = inventoryByProductId.get(productId);
    const product = getProductById(productId);

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

    setModalFeedback(
      `"${product?.name ?? productId}" added — ${Math.floor(quantity)} unit(s). On hand: ${invRow?.onHand ?? 0}.`,
    );
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
    setModalFeedback("");
    requestAnimationFrame(() => {
      orderGridRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    });
  };

  const addTopMatch = () => {
    if (!modalSearchQuery.trim()) {
      setModalFeedback("Type a medication name or SKU to search first.");
      return;
    }

    const firstMatch = filteredInventoryRows[0];
    if (!firstMatch) {
      setModalFeedback("No matching medication found. Try a different name or SKU.");
      return;
    }

    addItemToOrder(firstMatch.productId, modalAddQty);
    closeModalAndShowGrid();
  };

  const completeCustomerOrder = () => {
    if (!customerName.trim() || !customerPhone.trim() || !orderRef.trim()) {
      setFeedback("Customer Name, Phone, and Order/Rx Number are required.");
      return;
    }

    if (!draftOrderItems.length) {
      setFeedback("Add at least one medication item to the customer order.");
      return;
    }

    const stockAssessment = draftOrderItems.map(item => {
      const inventoryItem = inventoryByProductId.get(item.productId);
      const onHand = inventoryItem?.onHand ?? 0;
      const expiredUnits = inventoryItem?.expiredUnits ?? 0;
      const nearExpiryUnits = inventoryItem?.nearExpiryUnits ?? 0;
      const usableStock = Math.max(0, onHand - expiredUnits);

      return {
        ...item,
        usableStock,
        nearExpiryUnits,
      };
    });

    const hasExpiredOnlyBlock = stockAssessment.some(
      item => item.usableStock <= 0 || item.quantity > item.usableStock,
    );

    if (hasExpiredOnlyBlock) {
      setFeedback(
        "Order blocked: one or more medication lines only have expired or insufficient usable stock.",
      );
      return;
    }

    const hasNearExpiryWarning = stockAssessment.some(item => item.nearExpiryUnits > 0);

    const createdId = serveCustomerOrder({
      storeId: defaultStore.id,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerNotes,
      orderRef,
      items: draftOrderItems,
    });

    if (!createdId) {
      setFeedback("Unable to save order. Check available stock and quantities.");
      return;
    }

    setFeedback(
      hasNearExpiryWarning
        ? `Customer order ${createdId} saved. Warning: near-expiry stock was used by FEFO priority.`
        : `Customer order ${createdId} saved and inventory updated.`,
    );
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setCustomerNotes("");
    setOrderRef("");
    setDraftOrderItems([]);
    setTouched({customerName: false, customerPhone: false, orderRef: false});
  };

  const totalDraftUnits = draftOrderItems.reduce((acc, item) => acc + item.quantity, 0);
  const hasRequiredHeaderFields =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    orderRef.trim().length > 0;

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
            Returning Customer
            <select
              value={selectedCustomerId}
              onChange={event => {
                const nextId = event.target.value;
                setSelectedCustomerId(nextId);

                const selectedCustomer = storeCustomers.find(
                  profile => profile.id === nextId,
                );
                if (!selectedCustomer) return;

                setCustomerName(selectedCustomer.fullName);
                setCustomerPhone(selectedCustomer.phone);
                setCustomerEmail(selectedCustomer.email);
                setCustomerAddress(selectedCustomer.address);
                setCustomerNotes(selectedCustomer.notes);
                setTouched({customerName: false, customerPhone: false, orderRef: false});
              }}
            >
              <option value="">New customer entry</option>
              {storeCustomers.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName} ({profile.phone})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>
              Customer Name <span className="required-star">*</span>
            </span>
            <input
              type="text"
              required
              aria-required="true"
              aria-invalid={touched.customerName && !customerName.trim()}
              className={touched.customerName && !customerName.trim() ? "input-error" : ""}
              value={customerName}
              onChange={event => setCustomerName(event.target.value)}
              onBlur={() => touch("customerName")}
              placeholder="e.g. Alicia Morgan"
            />
            {touched.customerName && !customerName.trim() ? (
              <span className="field-error-msg">Customer name is required.</span>
            ) : null}
          </label>

          <label>
            <span>
              Mobile Number <span className="required-star">*</span>
            </span>
            <input
              type="text"
              required
              aria-required="true"
              aria-invalid={touched.customerPhone && !customerPhone.trim()}
              className={
                touched.customerPhone && !customerPhone.trim() ? "input-error" : ""
              }
              value={customerPhone}
              onChange={event => setCustomerPhone(event.target.value)}
              onBlur={() => touch("customerPhone")}
              placeholder="e.g. +63 917 555 0188"
            />
            {touched.customerPhone && !customerPhone.trim() ? (
              <span className="field-error-msg">Mobile number is required.</span>
            ) : null}
          </label>

          <label>
            Email (optional)
            <input
              type="email"
              value={customerEmail}
              onChange={event => setCustomerEmail(event.target.value)}
              placeholder="e.g. customer@example.com"
            />
          </label>

          <label>
            Address (optional)
            <input
              type="text"
              value={customerAddress}
              onChange={event => setCustomerAddress(event.target.value)}
              placeholder="e.g. Brgy. Poblacion, Cebu"
            />
          </label>

          <label>
            Notes (optional)
            <input
              type="text"
              value={customerNotes}
              onChange={event => setCustomerNotes(event.target.value)}
              placeholder="e.g. Pickup after 5 PM"
            />
          </label>

          <label>
            <span>
              Order / Rx Number <span className="required-star">*</span>
            </span>
            <input
              type="text"
              required
              aria-required="true"
              aria-invalid={touched.orderRef && !orderRef.trim()}
              className={touched.orderRef && !orderRef.trim() ? "input-error" : ""}
              value={orderRef}
              onChange={event => setOrderRef(event.target.value)}
              onBlur={() => touch("orderRef")}
              placeholder="e.g. RX-44823"
            />
            {touched.orderRef && !orderRef.trim() ? (
              <span className="field-error-msg">Order / Rx Number is required.</span>
            ) : null}
          </label>
        </div>

        <div className="actions-row" style={{justifyContent: "flex-start"}}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              if (!hasRequiredHeaderFields) {
                setTouched({customerName: true, customerPhone: true, orderRef: true});
                return;
              }
              setIsAddItemModalOpen(true);
            }}
          >
            Add Item
          </button>
        </div>

        {!hasRequiredHeaderFields && !Object.values(touched).some(Boolean) ? (
          <p className="muted-copy" style={{fontSize: "0.82rem"}}>
            Fill in <strong>Customer Name</strong>, <strong>Mobile Number</strong>, and{" "}
            <strong>Order / Rx Number</strong> above to unlock item search.
          </p>
        ) : null}

        <h4 ref={orderGridRef}>Order</h4>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Medication</th>
              <th>On Hand</th>
              <th>Usable</th>
              <th>Expiry Risk</th>
              <th>Order Qty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {draftOrderItems.length ? (
              draftOrderItems.map(item => {
                const row = inventoryByProductId.get(item.productId);
                const product = getProductById(item.productId);
                const onHand = row?.onHand ?? 0;
                const expiredUnits = row?.expiredUnits ?? 0;
                const nearExpiryUnits = row?.nearExpiryUnits ?? 0;
                const usableStock = Math.max(0, onHand - expiredUnits);
                const fefoBatch = [...(row?.batches ?? [])]
                  .filter(batch => {
                    if (batch.quantity <= 0) return false;
                    return new Date(batch.expiryDate).getTime() >= Date.now();
                  })
                  .sort(
                    (a, b) =>
                      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
                  )[0];

                return (
                  <tr key={item.productId}>
                    <td>{product?.sku}</td>
                    <td>{product?.name}</td>
                    <td>{onHand}</td>
                    <td>{usableStock}</td>
                    <td>
                      {expiredUnits > 0 ? (
                        <span className="status-badge critical">Expired units present</span>
                      ) : nearExpiryUnits > 0 ? (
                        <span className="status-badge warning">Near-expiry warning</span>
                      ) : (
                        <span className="status-badge healthy">Healthy</span>
                      )}
                      <div className="muted-copy" style={{fontSize: "0.72rem"}}>
                        {fefoBatch
                          ? `FEFO next: ${fefoBatch.expiryDate} (${fefoBatch.batchId})`
                          : "FEFO next: no eligible batch"}
                      </div>
                    </td>
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
                <td colSpan={7}>No items in this customer order yet.</td>
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
                onChange={event => {
                  setModalSearchQuery(event.target.value);
                  setModalFeedback("");
                }}
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

          {modalFeedback ? (
            <div className="preview-banner" role="status">
              {modalFeedback}
            </div>
          ) : null}

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
                  <td colSpan={4} className="muted-copy">
                    {modalSearchQuery.trim()
                      ? `No medications match "${modalSearchQuery}". Try a shorter word or the SKU code.`
                      : "Start typing a medication name or SKU code above to search available stock."}
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
