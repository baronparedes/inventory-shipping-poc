import {useMemo, useState} from "react";
import {getStoreById, stores} from "../../mocks/mockData";
import {usePrototypeState} from "../../state/usePrototypeState";
import Modal from "../../components/Modal";

export function WarehouseTracking() {
  const {shippingOrders} = usePrototypeState();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Draft" | "Packed" | "In Transit" | "Delivered"
  >("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredShipments = useMemo(() => {
    return shippingOrders
      .filter(order => (statusFilter === "all" ? true : order.status === statusFilter))
      .filter(order => (branchFilter === "all" ? true : order.storeId === branchFilter))
      .sort((a, b) => b.shipDate.localeCompare(a.shipDate));
  }, [shippingOrders, statusFilter, branchFilter]);

  const selectedShipment = useMemo(
    () =>
      filteredShipments.find(order => order.id === selectedShipmentId) ??
      filteredShipments[0],
    [filteredShipments, selectedShipmentId],
  );

  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Central Distribution Workflow</p>
          <h2>Shipment Tracking Board</h2>
          <p className="muted-copy">
            Dedicated real-time demo board for dispatch location, status checkpoints, and
            ETA follow-up.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="tracking-filters">
          <label>
            Shipment Status
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Packed">Packed</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
            </select>
          </label>

          <label>
            Destination Branch
            <select
              value={branchFilter}
              onChange={event => setBranchFilter(event.target.value)}
            >
              <option value="all">All branches</option>
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
              <th>Dispatch ID</th>
              <th>Tracking</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Current Location</th>
              <th>ETA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length ? (
              filteredShipments.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.trackingCode}</td>
                  <td>{getStoreById(order.storeId)?.name ?? order.storeId}</td>
                  <td>{order.status}</td>
                  <td>{order.currentLocation}</td>
                  <td>{order.eta}</td>
                  <td>
                    {order.id && (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setSelectedShipmentId(order.id);
                          setIsModalOpen(true);
                        }}
                      >
                        View Timeline
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No shipments match the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="table-header">
            <h3>Shipment Timeline</h3>
            {selectedShipment ? (
              <span className="status-badge warning">{selectedShipment.id}</span>
            ) : null}
          </div>

          {selectedShipment ? (
            <>
              <div className="timeline-summary-grid">
                <p>
                  <strong>Tracking:</strong> {selectedShipment.trackingCode}
                </p>
                <p>
                  <strong>Carrier:</strong> {selectedShipment.carrier}
                </p>
                <p>
                  <strong>Status:</strong> {selectedShipment.status}
                </p>
                <p>
                  <strong>Current Location:</strong> {selectedShipment.currentLocation}
                </p>
              </div>

              <ol className="shipment-timeline-list">
                {[...selectedShipment.statusHistory]
                  .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
                  .map((event, index) => (
                    <li key={`${event.occurredAt}-${index}`}>
                      <div>
                        <p className="eyebrow">{event.status}</p>
                        <h4>{event.location}</h4>
                        <p className="muted-copy">
                          {new Date(event.occurredAt).toLocaleString()}
                        </p>
                      </div>
                      <p>{event.note}</p>
                    </li>
                  ))}
              </ol>
            </>
          ) : (
            <p className="muted-copy">
              Select a shipment to inspect its timeline checkpoints.
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
