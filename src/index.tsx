import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initMonitoring } from "./lib/monitoring";

// ── Environment variable validation ─────────────────────────────────────────
// Fail fast if required Firebase config is missing before the app even mounts.
const REQUIRED_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missing = REQUIRED_ENV_VARS.filter(
  (key) =>
    !import.meta.env[key] || (import.meta.env[key] as string).trim() === "",
);

if (missing.length > 0) {
  const msg = `[AndamanBazaar] Missing required environment variables:\n  ${missing.join("\n  ")}\n\nCopy .env.example to .env and fill in the values.`;
  // eslint-disable-next-line no-console
  console.error(msg);
  document.body.innerHTML = `<pre style="padding:2rem;color:red;font-size:14px">${msg}</pre>`;
  throw new Error(msg);
}
// ── End env validation ───────────────────────────────────────────────────────

initMonitoring();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
