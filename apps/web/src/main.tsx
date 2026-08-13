import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyFreshClientBuild } from "./lib/fresh-client";
import "./styles/tokens.css";

if (!applyFreshClientBuild()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
