import {useEffect, useMemo, useState} from "react";
import {getProductById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function WarehouseMonitor() {
  const {storeInventory, inventoryTransactions, customerOrders} = usePrototypeState();
  const [selectedBranchId, setSelectedBranchId] = useState(stores[0]?.id ?? "");
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const selectedBranch = stores.find(store => store.id === selectedBranchId) ?? stores[0];

  const selectedBranchInventory = useMemo(
    () =>
      storeInventory
        .filter(item => item.storeId === selectedBranch?.id)
        .map(item => ({
          ...item,
          product: getProductById(item.productId),
        }))
        .filter(item => item.product),
    [storeInventory, selectedBranch?.id],
  );

  const networkTransactions = useMemo(
    () =>
      inventoryTransactions
        .map(transaction => ({
          ...transaction,
          branch: stores.find(store => store.id === transaction.storeId),
          product: getProductById(transaction.productId),
        }))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [inventoryTransactions],
  );

  const weeklyDispenseByStoreProduct = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return customerOrders
      .filter(order => new Date(order.servedAt) >= cutoff)
      .flatMap(order =>
        order.items.map(item => ({
          key: `${order.storeId}:${item.productId}`,
          quantity: item.quantity,
        })),
      )
      .reduce(
        (acc, item) => {
          acc[item.key] = (acc[item.key] ?? 0) + item.quantity;
          return acc;
        },
        {} as Record<string, number>,
      );
  }, [customerOrders]);

  useEffect(() => {
    if (!isInventoryModalOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInventoryModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isInventoryModalOpen]);

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Central Distribution Workflow</p>
          <h2>Branch Stock Monitoring</h2>
          <p className="muted-copy">
            Compare branch stock health and identify where to route inventory first.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Branch Stock Heat List</h3>
          <span className="status-badge warning">Live Status</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>City</th>
              <th>Low Stock Medication SKUs</th>
              <th>Urgency</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => {
              const shortageCount = storeInventory.filter(item => {
                if (item.storeId !== store.id) return false;
                const product = getProductById(item.productId);
                return product ? item.onHand <= product.reorderThreshold : false;
              }).length;
              const urgencyClass = shortageCount >= 2 ? "critical" : "healthy";
              const urgencyLabel = shortageCount >= 2 ? "Needs Restock" : "Stable";

              return (
                <tr key={store.id}>
                  <td>{store.name}</td>
                  <td>{store.city}</td>
                  <td>{shortageCount}</td>
                  <td>
                    <span className={`status-badge ${urgencyClass}`}>{urgencyLabel}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setSelectedBranchId(store.id);
                        setIsInventoryModalOpen(true);
                      }}
                    >
                      View Inventory
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Network Item Movement Ledger</h3>
        <p className="muted-copy">
          Consolidated inventory movement log across all branch pharmacies.
        </p>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Branch</th>
              <th>City</th>
              <th>Type</th>
              <th>SKU</th>
              <th>Medication</th>
              <th>Qty</th>
              <th>Reference</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {networkTransactions.length ? (
              networkTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.occurredAt).toLocaleString()}</td>
                  <td>{transaction.branch?.name ?? transaction.storeId}</td>
                  <td>{transaction.branch?.city ?? "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        transaction.movementType === "IN" ? "healthy" : "warning"
                      }`}
                    >
                      {transaction.movementType}
                    </span>
                  </td>
                  <td>{transaction.product?.sku ?? transaction.productId}</td>
                  <td>{transaction.product?.name ?? transaction.productId}</td>
                  <td>{transaction.quantity}</td>
                  <td>{transaction.reference}</td>
                  <td>{transaction.note}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>No inventory transactions recorded across branches yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {isInventoryModalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setIsInventoryModalOpen(false)}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="table-header">
              <h3>{selectedBranch?.name} Inventory Detail</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsInventoryModalOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="muted-copy">{selectedBranch?.city}</p>

            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Medication</th>
                  <th>On Hand</th>
                  <th>Threshold</th>
                  <th>Weekly Outflow</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedBranchInventory.length ? (
                  selectedBranchInventory.map(item => {
                    const isLow = (item.product?.reorderThreshold ?? 0) >= item.onHand;

                    return (
                      <tr key={item.productId}>
                        <td>{item.product?.sku}</td>
                        <td>{item.product?.name}</td>
                        <td>{item.onHand}</td>
                        <td>{item.product?.reorderThreshold}</td>
                        <td>
                          {weeklyDispenseByStoreProduct[
                            `${selectedBranch?.id}:${item.productId}`
                          ] ?? 0}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${isLow ? "critical" : "healthy"}`}
                          >
                            {isLow ? "Low" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>No inventory rows found for this branch.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
