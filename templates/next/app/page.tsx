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
  const [amount, setAmount] = useState("100");
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const status = useMemo(() => {
    if (!ready) return "Loading Privy...";
    return authenticated ? "Wallet connected" : "Not connected";
  }, [authenticated, ready]);

  const amountValue = Number(amount);
  const validation = identifier ? PLATFORMS.VENMO.validate(identifier) : null;
  const canSubmit =
    Boolean(walletClient) &&
    !isSubmitting &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    Boolean(identifier.trim()) &&
    (!validation || validation.valid);

  async function handleSubmit() {
    if (!walletClient || !canSubmit) return;

    setIsSubmitting(true);
    setSubmitMessage("Creating deposit on Base...");

    try {
      const result = await offramp(walletClient, {
        amount,
        currency: CURRENCIES.USD,
        platform: PLATFORMS.VENMO,
        identifier: identifier.trim(),
        integratorId: INTEGRATOR_ID,
        referralId: REFERRAL_ID,
      });

      setSubmitMessage(`Deposit #${result.depositId} created.`);
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
            style={{ display: "grid", gap: 12, maxWidth: 360 }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              USDC amount
              <input
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                style={{ minHeight: 40 }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Venmo username
              <input
                placeholder={PLATFORMS.VENMO.identifier.placeholder}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                style={{ minHeight: 40 }}
              />
            </label>
            {validation && !validation.valid ? (
              <p style={{ margin: 0, color: "#b42318" }}>{validation.error}</p>
            ) : null}
            <button disabled={!canSubmit} type="submit" style={{ minHeight: 40 }}>
              {isSubmitting ? "Creating..." : `Sell ${amount || "0"} USDC`}
            </button>
          </form>
        ) : (
          <p style={{ marginBottom: 0, opacity: 0.8 }}>Connect a wallet to start an offramp.</p>
        )}
        {submitMessage ? <p style={{ marginBottom: 0 }}>{submitMessage}</p> : null}
      </section>
    </main>
  );
}
