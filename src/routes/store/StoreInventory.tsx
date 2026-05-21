import {useMemo, useState} from "react";
import {getProductById, getStoreById, stores} from "../../mocks/mockData";
import Modal from "../../components/Modal";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StoreInventory() {
  const {
    storeInventory,
    inventoryTransactions,
    customerOrders,
    shippingOrders,
    receiveShipment,
    selectedStoreId,
  } = usePrototypeState();
  const defaultStore = getStoreById(selectedStoreId) ?? stores[0];
  const availableShipments = useMemo(
    () =>
      shippingOrders.filter(
        shipment =>
          shipment.storeId === defaultStore.id &&
          (shipment.status === "Packed" || shipment.status === "In Transit"),
      ),
    [shippingOrders, defaultStore.id],
  );

  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const inventoryRows = useMemo(
    () =>
      storeInventory
        .filter(item => item.storeId === defaultStore.id)
        .map(item => ({...item, product: getProductById(item.productId)}))
        .filter(item => item.product),
    [storeInventory, defaultStore.id],
  );

  const selectedShipment = useMemo(
    () => availableShipments.find(shipment => shipment.id === selectedShipmentId),
    [availableShipments, selectedShipmentId],
  );

  const selectedShipmentTotalQty =
    selectedShipment?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  const branchTransactions = useMemo(
    () =>
      inventoryTransactions
        .filter(transaction => transaction.storeId === defaultStore.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [inventoryTransactions, defaultStore.id],
  );

  const weeklyDispenseByProduct = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return customerOrders
      .filter(order => order.storeId === defaultStore.id)
      .filter(order => new Date(order.servedAt) >= cutoff)
      .flatMap(order => order.items)
      .reduce(
        (acc, item) => {
          acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
          return acc;
        },
        {} as Record<string, number>,
      );
  }, [customerOrders, defaultStore.id]);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Pharmacy Branch Workflow</p>
          <h2>Pharmacy Inventory Receiving</h2>
          <p className="muted-copy">
            Record inbound medication receiving and monitor branch stock levels.
          </p>
        </div>
      </header>

      <article className="card">
        <h3>Current Branch Inventory</h3>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Medication</th>
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
                <td>{weeklyDispenseByProduct[row.productId] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Receive Distribution Shipment</h3>
        <p className="muted-copy">
          Inbound stock can only be received from dispatch shipments sent by the
          distribution center.
        </p>

        <table>
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>ETA</th>
              <th>Tracking</th>
              <th>Current Location</th>
              <th>Status</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {availableShipments.length ? (
              availableShipments.map(shipment => (
                <tr key={shipment.id}>
                  <td>{shipment.id}</td>
                  <td>{shipment.eta}</td>
                  <td>{shipment.trackingCode}</td>
                  <td>{shipment.currentLocation}</td>
                  <td>{shipment.status}</td>
                  <td>{shipment.items.length}</td>
                  <td>{shipment.items.reduce((acc, item) => acc + item.quantity, 0)}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setSelectedShipmentId(shipment.id);
                        setIsShipmentModalOpen(true);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>No inbound shipments available.</td>
              </tr>
            )}
          </tbody>
        </table>

        {feedback && <div className="preview-banner">{feedback}</div>}
      </article>

      <article className="card">
        <h3>Branch Item Movement Transaction Log</h3>
        <p className="muted-copy">
          Detailed ledger of all inbound and outbound medication movement for this branch.
        </p>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>SKU</th>
              <th>Medication</th>
              <th>Qty</th>
              <th>Reference</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {branchTransactions.length ? (
              branchTransactions.map(transaction => {
                const product = getProductById(transaction.productId);

                return (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.occurredAt).toLocaleString()}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          transaction.movementType === "IN" ? "healthy" : "warning"
                        }`}
                      >
                        {transaction.movementType}
                      </span>
                    </td>
                    <td>{product?.sku ?? transaction.productId}</td>
                    <td>{product?.name ?? transaction.productId}</td>
                    <td>{transaction.quantity}</td>
                    <td>{transaction.reference}</td>
                    <td>{transaction.note}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>No branch item movement transactions recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {isShipmentModalOpen && selectedShipment ? (
        <Modal
          onClose={() => {
            setIsShipmentModalOpen(false);
            setSelectedShipmentId("");
          }}
        >
          <h3>Shipment Details</h3>

          <div className="form-grid">
            <p>
              <strong>Shipment ID:</strong> {selectedShipment.id}
            </p>
            <p>
              <strong>Status:</strong> {selectedShipment.status}
            </p>
            <p>
              <strong>ETA:</strong> {selectedShipment.eta}
            </p>
            <p>
              <strong>Ship Date:</strong> {selectedShipment.shipDate}
            </p>
            <p>
              <strong>Items:</strong> {selectedShipment.items.length}
            </p>
            <p>
              <strong>Total Qty:</strong> {selectedShipmentTotalQty}
            </p>
          </div>

          <h4>Shipment Items</h4>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Medication</th>
                <th>Shipment Qty</th>
              </tr>
            </thead>
            <tbody>
              {selectedShipment.items.map(item => (
                <tr key={item.productId}>
                  <td>{getProductById(item.productId)?.sku}</td>
                  <td>{getProductById(item.productId)?.name}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="preview-banner">
            {`Preview: Receive shipment ${selectedShipment.id} with ${selectedShipment.items.length} items (${selectedShipmentTotalQty} total units).`}
          </div>

          <div className="actions-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setIsShipmentModalOpen(false);
                setSelectedShipmentId("");
              }}
            >
              Close
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                const receivedId = receiveShipment(selectedShipment.id);
                if (!receivedId) {
                  setFeedback("Unable to receive shipment. It may already be delivered.");
                  return;
                }

                setFeedback(`Shipment ${receivedId} received and inventory updated.`);
                setIsShipmentModalOpen(false);
                setSelectedShipmentId("");
              }}
            >
              Receive Shipment
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
