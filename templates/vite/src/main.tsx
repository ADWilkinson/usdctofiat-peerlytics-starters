import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { App } from "./App";
// oxlint-disable-next-line import/no-unassigned-import -- Vite entrypoints must import global CSS for side effects.
import "./styles.css";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID ?? "";
const app = privyAppId ? (
  <PrivyProvider
    appId={privyAppId}
    config={{ appearance: { theme: "dark", accentColor: "#82c97e" } }}
  >
    <App />
  </PrivyProvider>
) : (
  <main className="setup-screen">
    <section>
      <p className="eyebrow">Setup required</p>
      <h1>Add your Privy app ID</h1>
      <p className="muted">
        Add this key to <code>.env.local</code>:
        <code className="code-line">VITE_PRIVY_APP_ID</code>
        The template builds without secrets; Privy starts once the value is real.
      </p>
    </section>
  </main>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{app}</StrictMode>,
);
