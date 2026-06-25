import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadRuntimeConfig } from "./config.js";
import App from "./App.jsx";
import "./index.css";

async function start() {
  await loadRuntimeConfig();
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

start();
