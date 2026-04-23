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

export function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const walletClient = useWalletClient();

  const status = useMemo(() => {
    if (!ready) return "Loading Privy…";
    return authenticated ? "Wallet connected" : "Not connected";
  }, [authenticated, ready]);

  return (
    <main>
      <h1>Offramp Vite Starter</h1>
      <p className="muted">Integrator: {INTEGRATOR_ID}</p>

      <section>
        <p>Status: {status}</p>
        {!authenticated ? (
          <button onClick={() => login()} className="btn-secondary">
            Connect wallet
          </button>
        ) : (
          <button onClick={() => logout()} className="btn-secondary">
            Disconnect
          </button>
        )}

        <div style={{ marginTop: 14 }}>
          {walletClient ? (
            <button
              className="btn-primary"
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
            >
              Sell 100 USDC
            </button>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              Connect a wallet to start an offramp.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
