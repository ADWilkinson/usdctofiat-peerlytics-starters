"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CURRENCIES, PLATFORMS, offramp } from "@usdctofiat/offramp";
import { createWalletClient, custom, type WalletClient } from "viem";
import { base } from "viem/chains";

const INTEGRATOR_ID = "__INTEGRATOR_ID__";
const REFERRAL_ID = "TODO_SET_REFERRAL_ID";

function useWalletClient(): WalletClient | null {
  const { wallets } = useWallets();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    const wallet =
      wallets.find((entry) => typeof entry.getEthereumProvider === "function") ?? wallets[0];

    if (!wallet?.address || typeof wallet.getEthereumProvider !== "function") {
      setWalletClient(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const provider = await wallet.getEthereumProvider();
        if (cancelled || !provider) return;
        setWalletClient(
          createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: base,
            transport: custom(provider as Parameters<typeof custom>[0]),
          }),
        );
      } catch {
        if (!cancelled) setWalletClient(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallets]);

  return walletClient;
}

export default function HomePage() {
  const { ready, authenticated, login, logout } = usePrivy();
  const walletClient = useWalletClient();

  const status = useMemo(() => {
    if (!ready) return "Loading Privy…";
    return authenticated ? "Wallet connected" : "Not connected";
  }, [authenticated, ready]);

  return (
    <main>
      <h1 style={{ fontSize: "2.35rem", marginBottom: "0.5rem" }}>Offramp Starter</h1>
      <p style={{ marginTop: 0, opacity: 0.9 }}>Integrator: {INTEGRATOR_ID}</p>

      <section>
        <p style={{ marginTop: 0 }}>Status: {status}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {!authenticated ? (
            <button onClick={() => login()} style={{ minHeight: 40 }}>
              Connect wallet
            </button>
          ) : (
            <button onClick={() => logout()} style={{ minHeight: 40 }}>
              Disconnect
            </button>
          )}
        </div>

        {walletClient ? (
          <button
            onClick={() => {
              offramp(walletClient, {
                amount: "100",
                currency: CURRENCIES.USD,
                platform: PLATFORMS.VENMO,
                identifier: "alice",
                integratorId: INTEGRATOR_ID,
                referralId: REFERRAL_ID,
              }).catch((error: Error) => {
                console.error(error.message);
              });
            }}
            style={{ minHeight: 40 }}
          >
            Sell 100 USDC
          </button>
        ) : (
          <p style={{ marginBottom: 0, opacity: 0.8 }}>Connect a wallet to start an offramp.</p>
        )}
      </section>
    </main>
  );
}
