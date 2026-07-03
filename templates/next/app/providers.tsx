"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: ReactNode }) {
  if (!privyAppId || privyAppId === "privy_template_app_id_000") {
    return (
      <main className="setup-screen">
        <section>
          <p className="eyebrow">Setup required</p>
          <h1>Add your Privy app ID</h1>
          <p>
            Add this key to <code>.env.local</code>:
            <code className="code-line">NEXT_PUBLIC_PRIVY_APP_ID</code>
            The template builds without secrets; Privy starts once the value is real.
          </p>
        </section>
      </main>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#82c97e",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
