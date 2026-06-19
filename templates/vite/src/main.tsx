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
        Set <code>VITE_PRIVY_APP_ID</code> in <code>.env.local</code> before
        running the wallet flow. The template still builds without secrets, but
        Privy cannot initialize until this value is real.
      </p>
    </section>
  </main>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{app}</StrictMode>,
);
