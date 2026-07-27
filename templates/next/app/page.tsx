"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  CURRENCIES,
  OFFRAMP_DEVELOPER_RESOURCES,
  PLATFORMS,
  offramp,
} from "@usdctofiat/offramp";
import { createWalletClient, custom, type WalletClient } from "viem";
import { base } from "viem/chains";

const DEFAULT_INTEGRATOR_ID = "__INTEGRATOR_ID__";
const DEFAULT_REFERRAL_ID = "TODO_SET_REFERRAL_ID";
const INTEGRATOR_ID = process.env.NEXT_PUBLIC_INTEGRATOR_ID || DEFAULT_INTEGRATOR_ID;
const REFERRAL_ID = process.env.NEXT_PUBLIC_REFERRAL_ID || DEFAULT_REFERRAL_ID;
const configuredReferralId = REFERRAL_ID === DEFAULT_REFERRAL_ID ? undefined : REFERRAL_ID;
const resourceLinks = [
  ["SDK guide", OFFRAMP_DEVELOPER_RESOURCES.links.sdkGuide],
  ["App guide", OFFRAMP_DEVELOPER_RESOURCES.links.appGuide],
  ["Peerlytics", OFFRAMP_DEVELOPER_RESOURCES.links.peerlyticsDevelopers],
  ["Agent skill", OFFRAMP_DEVELOPER_RESOURCES.links.agentSkill],
] as const;

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
        await wallet.switchChain(base.id);
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
  const validation = identifier.trim()
    ? PLATFORMS.REVOLUT.validate(identifier.trim())
    : null;
  const canSubmit =
    Boolean(walletClient) &&
    !isSubmitting &&
    Number.isFinite(amountValue) &&
    amountValue >= 1 &&
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
        platform: PLATFORMS.REVOLUT,
        identifier: identifier.trim(),
        integratorId: INTEGRATOR_ID,
        ...(configuredReferralId ? { referralId: configuredReferralId } : {}),
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
      <header className="hero">
        <p className="eyebrow">Base USDC cash-out</p>
        <h1>Offramp Starter</h1>
        <p className="lede">
        Uses {OFFRAMP_DEVELOPER_RESOURCES.packageName} v
        {OFFRAMP_DEVELOPER_RESOURCES.sdkVersion} on Base. Deposits are created by
        the connected wallet and must delegate to the managed rate manager.
      </p>
      </header>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Wallet</p>
            <h2>Create a seller deposit</h2>
          </div>
          <span className="status-pill">{status}</span>
        </div>

        <div className="actions">
          {!authenticated ? (
            <button onClick={() => login()} className="button button-secondary">
              Connect wallet
            </button>
          ) : (
            <button onClick={() => logout()} className="button button-secondary">
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
            className="form-grid"
          >
            <label className="field">
              <span>USDC amount</span>
              <input
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Revolut Revtag</span>
              <input
                placeholder={PLATFORMS.REVOLUT.identifier.placeholder}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </label>
            {validation && !validation.valid ? (
              <p className="error">{validation.error}</p>
            ) : null}
            <button className="button button-primary" disabled={!canSubmit} type="submit">
              {isSubmitting ? "Creating..." : `Sell ${amount || "0"} USDC`}
            </button>
          </form>
        ) : (
          <p className="muted">Connect a wallet to start an offramp.</p>
        )}
        {submitMessage ? <p className="notice">{submitMessage}</p> : null}
      </section>

      <section className="panel resource-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Reference</p>
            <h2>Ship from canonical resources</h2>
          </div>
        </div>
        <div className="resource-links">
          {resourceLinks.map(([label, href]) => (
            <a key={href} href={href} rel="noreferrer" target="_blank">
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
