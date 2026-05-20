import {getLowStockItems, stores} from "../../mocks/mockData";

export function WarehouseMonitor() {
  return (
    <section>
      <header className="section-head">
        <div>
          <p className="eyebrow">Warehouse Workflow</p>
          <h2>Store Stock Monitoring</h2>
          <p className="muted-copy">
            Compare store health and identify where to route warehouse inventory first.
          </p>
        </div>
      </header>

      <article className="card">
        <div className="table-header">
          <h3>Store Stock Heat List</h3>
          <span className="status-badge warning">Auto-refresh mock</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>City</th>
              <th>Low Stock SKUs</th>
              <th>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => {
              const shortageCount = getLowStockItems(store.id).length;
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
}
