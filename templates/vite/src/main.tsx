import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { App } from "./App";
// oxlint-disable-next-line import/no-unassigned-import -- Vite entrypoints must import global CSS for side effects.
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "pk_test_missing"}
      config={{ appearance: { theme: "dark", accentColor: "#82c97e" } }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
);
