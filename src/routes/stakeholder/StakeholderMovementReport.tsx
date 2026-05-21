import {useMemo, useState} from "react";
import {getProductById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";

export function StakeholderMovementReport() {
  const {inventoryTransactions, shippingOrders} = usePrototypeState();
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredTransactions = useMemo(() => {
    const rows =
      branchFilter === "all"
        ? inventoryTransactions
        : inventoryTransactions.filter(item => item.storeId === branchFilter);

    return [...rows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [inventoryTransactions, branchFilter]);

  const cycleTimeRows = useMemo(
    () =>
      shippingOrders
        .filter(order => order.statusHistory.length >= 2)
        .map(order => {
          const firstEvent = order.statusHistory[0];
          const deliveredEvent = [...order.statusHistory]
            .reverse()
            .find(entry => entry.status === "Delivered");

          const totalHours = deliveredEvent
            ? Math.max(
                0,
                Math.round(
                  (new Date(deliveredEvent.occurredAt).getTime() -
                    new Date(firstEvent.occurredAt).getTime()) /
                    (1000 * 60 * 60),
                ),
              )
            : null;

          return {
            ...order,
            totalHours,
          };
        })
        .sort((a, b) => b.shipDate.localeCompare(a.shipDate)),
    [shippingOrders],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Stakeholder View</p>
          <h2>Movement and Fulfillment Report</h2>
          <p className="muted-copy">
            Read-only report of item movements and shipment cycle time across the network.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Inventory Movement Ledger</h3>
          <label>
            Branch Filter
            <select
              value={branchFilter}
              onChange={event => setBranchFilter(event.target.value)}
            >
              <option value="all">All Branches</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Branch</th>
              <th>Type</th>
              <th>SKU</th>
              <th>Medication</th>
              <th>Qty</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length ? (
              filteredTransactions.map(entry => {
                const store = stores.find(item => item.id === entry.storeId);
                const product = getProductById(entry.productId);

                return (
                  <tr key={entry.id}>
                    <td>{new Date(entry.occurredAt).toLocaleString()}</td>
                    <td>{store?.name ?? entry.storeId}</td>
                    <td>{entry.movementType}</td>
                    <td>{product?.sku ?? entry.productId}</td>
                    <td>{product?.name ?? entry.productId}</td>
                    <td>{entry.quantity}</td>
                    <td>{entry.reference}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>No movement rows available for this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Shipment Cycle Time Snapshot</h3>
        <table>
          <thead>
            <tr>
              <th>Dispatch ID</th>
              <th>Tracking</th>
              <th>Status</th>
              <th>Current Location</th>
              <th>Cycle Time (hours)</th>
            </tr>
          </thead>
          <tbody>
            {cycleTimeRows.length ? (
              cycleTimeRows.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.trackingCode}</td>
                  <td>{order.status}</td>
                  <td>{order.currentLocation}</td>
                  <td>{order.totalHours ?? "In progress"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No shipment records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}
