import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import {PrototypeStateProvider} from "./state/PrototypeState";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrototypeStateProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PrototypeStateProvider>
  </StrictMode>,
);
