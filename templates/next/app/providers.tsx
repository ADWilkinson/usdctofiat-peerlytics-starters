"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "pk_test_missing"}
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
