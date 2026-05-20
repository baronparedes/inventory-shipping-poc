import {Navigate, Route, Routes} from "react-router-dom";
import {AppShell} from "./components/AppShell";
import {LandingPage} from "./routes/LandingPage";
import {LoginPage} from "./routes/LoginPage";
import {StoreDashboard} from "./routes/store/StoreDashboard";
import {StoreInventory} from "./routes/store/StoreInventory";
import {StoreReorder} from "./routes/store/StoreReorder";
import {WarehouseDashboard} from "./routes/warehouse/WarehouseDashboard";
import {WarehouseMonitor} from "./routes/warehouse/WarehouseMonitor";
import {WarehouseShipping} from "./routes/warehouse/WarehouseShipping";

function NotFoundPage() {
  return (
    <section className="login-wrap">
      <p className="eyebrow">404</p>
      <h1>Page Not Found</h1>
      <p className="muted-copy">Use the navigation to return to a valid route.</p>
    </section>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/app/store" element={<AppShell role="store" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StoreDashboard />} />
        <Route path="inventory" element={<StoreInventory />} />
        <Route path="reorder" element={<StoreReorder />} />
      </Route>

      <Route path="/app/warehouse" element={<AppShell role="warehouse" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<WarehouseDashboard />} />
        <Route path="monitor" element={<WarehouseMonitor />} />
        <Route path="shipping" element={<WarehouseShipping />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
