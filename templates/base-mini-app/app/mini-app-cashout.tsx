"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
const APP_KICKER = process.env.NEXT_PUBLIC_APP_KICKER || "USDCtoFiat on Base";
const APP_URL =
  typeof window === "undefined"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
const configuredReferralId = REFERRAL_ID === DEFAULT_REFERRAL_ID ? undefined : REFERRAL_ID;

async function getBaseAccountSdk() {
  const { createBaseAccountSDK } = await import("@base-org/account");
  return createBaseAccountSDK({
    appName: "USDCtoFiat",
    appLogoUrl: `${APP_URL}/icon.png`,
    appChainIds: [base.id],
  });
}

const routes = [
  {
    id: "venmo",
    label: "Venmo",
    currency: CURRENCIES.USD,
    platform: PLATFORMS.VENMO,
  },
  {
    id: "wise-usd",
    label: "Wise USD",
    currency: CURRENCIES.USD,
    platform: PLATFORMS.WISE,
  },
  {
    id: "revolut-eur",
    label: "Revolut EUR",
    currency: CURRENCIES.EUR,
    platform: PLATFORMS.REVOLUT,
  },
] as const;

const resourceLinks = [
  ["SDK", OFFRAMP_DEVELOPER_RESOURCES.links.sdkGuide],
  ["Docs", OFFRAMP_DEVELOPER_RESOURCES.links.appGuide],
  ["Webhooks", OFFRAMP_DEVELOPER_RESOURCES.links.webhooksGuide],
] as const;

async function getMiniAppWalletClient(): Promise<WalletClient> {
  const baseAccountSdk = await getBaseAccountSdk();
  const provider = baseAccountSdk.getProvider();
  await provider.request({ method: "wallet_connect" });
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  const account = accounts[0];
  if (!account) throw new Error("No Base Account address returned.");

  return createWalletClient({
    account,
    chain: base,
    transport: custom(provider as Parameters<typeof custom>[0]),
  });
}

export function MiniAppCashout() {
  const [amount, setAmount] = useState("50");
  const [identifier, setIdentifier] = useState("");
  const [routeId, setRouteId] = useState<(typeof routes)[number]["id"]>("venmo");
  const [walletStatus, setWalletStatus] = useState("Connect");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === routeId) ?? routes[0],
    [routeId],
  );
  const amountValue = Number(amount);
  const validation = identifier ? selectedRoute.platform.validate(identifier) : null;
  const canSubmit =
    !isSubmitting &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    Boolean(identifier.trim()) &&
    (!validation || validation.valid);

  useEffect(() => {
    void import("@base-org/account")
      .then(({ getCryptoKeyAccount }) => getCryptoKeyAccount())
      .then((cryptoAccount) => {
        if (cryptoAccount?.account?.address) setWalletStatus("Wallet ready");
      })
      .catch(() => {});
  }, []);

  const connectWallet = useCallback(async () => {
    setWalletStatus("Connecting...");
    try {
      await getMiniAppWalletClient();
      setWalletStatus("Wallet ready");
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitMessage("Creating deposit on Base...");

    try {
      const walletClient = await getMiniAppWalletClient();
      const result = await offramp(walletClient, {
        amount,
        currency: selectedRoute.currency,
        platform: selectedRoute.platform,
        identifier: identifier.trim(),
        integratorId: INTEGRATOR_ID,
        ...(configuredReferralId ? { referralId: configuredReferralId } : {}),
      });

      setWalletStatus("Wallet ready");
      setSubmitMessage(`Deposit #${result.depositId} created.`);
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, canSubmit, identifier, selectedRoute]);

  return (
    <main className="shell">
      <section className="panel stack">
        <div>
          <p className="muted fine" style={{ margin: 0 }}>
            {APP_KICKER}
          </p>
          <h1 style={{ fontSize: "1.6rem", lineHeight: 1.1, margin: "6px 0 0" }}>
            Cash out Base USDC
          </h1>
        </div>

        <p className="muted fine" style={{ margin: 0 }}>
          Pick a payment app, enter the handle where you want to be paid, and create a seller
          deposit from your wallet.
        </p>

        <div className="row fine">
          <span className="muted">Wallet</span>
          <button type="button" onClick={connectWallet} style={{ padding: "0 12px" }}>
            {walletStatus}
          </button>
        </div>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="field">
            <span>Route</span>
            <select value={routeId} onChange={(event) => setRouteId(event.target.value as typeof routeId)}>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.label}
                </option>
              ))}
            </select>
          </label>

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
            <span>{selectedRoute.label} handle</span>
            <input
              placeholder={selectedRoute.platform.identifier.placeholder}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          {validation && !validation.valid ? (
            <p className="fine" style={{ color: "#ffb4a8", margin: 0 }}>
              {validation.error}
            </p>
          ) : null}

          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Creating..." : `Sell ${amount || "0"} USDC`}
          </button>
        </form>

        {submitMessage ? <p className="fine">{submitMessage}</p> : null}

        <div className="links fine">
          {resourceLinks.map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
