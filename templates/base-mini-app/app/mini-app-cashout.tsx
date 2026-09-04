"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OFFRAMP_DEVELOPER_RESOURCES, PLATFORMS, cashout } from "@usdctofiat/offramp";
import { Attribution } from "ox/erc8021";
import { createWalletClient, custom, type WalletClient } from "viem";
import { base } from "viem/chains";

const DEFAULT_BASE_BUILDER_CODE = "bc_srxybeyl";
const BASE_BUILDER_CODE =
  process.env.NEXT_PUBLIC_BASE_BUILDER_CODE || DEFAULT_BASE_BUILDER_CODE;
const APP_KICKER = process.env.NEXT_PUBLIC_APP_KICKER || "USDCtoFiat on Base";
const APP_URL =
  typeof window === "undefined"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
const dataSuffix = Attribution.toDataSuffix({ codes: [BASE_BUILDER_CODE] });

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
    id: "revolut-usd",
    label: "Revolut USD",
    currency: "USD",
    platform: PLATFORMS.REVOLUT,
  },
  {
    id: "venmo",
    label: "Venmo",
    currency: "USD",
    platform: PLATFORMS.VENMO,
  },
  {
    id: "wise-usd",
    label: "Wise USD",
    currency: "USD",
    platform: PLATFORMS.WISE,
  },
] as const;

// The SDK bakes its link bundle into the published package, and the hosted
// developer portal it advertises has been 404 since 2026-09-02 (#15):
// sdkGuide, appGuide, botGuide, agentSkill and peerlyticsDevelopers all point
// at removed pages. A scaffolded app renders this row to its own users, so name
// only the keys that still resolve.
const resourceLinks = [
  ["SDK", OFFRAMP_DEVELOPER_RESOURCES.links.fullMachineReference],
  ["Starters", OFFRAMP_DEVELOPER_RESOURCES.links.starters],
] as const;

async function getMiniAppWalletClient(): Promise<WalletClient> {
  const baseAccountSdk = await getBaseAccountSdk();
  const provider = baseAccountSdk.getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  const account = accounts[0];
  if (!account) throw new Error("No Base Account address returned.");

  return createWalletClient({
    account,
    chain: base,
    dataSuffix,
    transport: custom(provider as Parameters<typeof custom>[0]),
  });
}

export function MiniAppCashout() {
  const [amount, setAmount] = useState("50");
  const [identifier, setIdentifier] = useState("");
  const [routeId, setRouteId] = useState<(typeof routes)[number]["id"]>("revolut-usd");
  const [walletStatus, setWalletStatus] = useState("Connect");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === routeId) ?? routes[0],
    [routeId],
  );
  const amountValue = Number(amount);
  const validation = identifier.trim()
    ? selectedRoute.platform.validate(identifier.trim())
    : null;
  const canSubmit =
    !isSubmitting &&
    Number.isFinite(amountValue) &&
    amountValue >= 1 &&
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
      const result = await cashout({
        mode: "best",
        signer: walletClient,
        amount,
        currency: selectedRoute.currency,
        platform: selectedRoute.platform.id,
        payee: validation?.valid ? validation.normalized : identifier.trim(),
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
        <div className="hero">
          <p className="eyebrow">{APP_KICKER}</p>
          <h1>Cash out Base USDC</h1>
        </div>

        <p className="muted fine">
          Pick a payment app, enter the handle where you want to be paid, and create a seller
          deposit from your wallet.
        </p>

        <div className="row fine">
          <span className="muted">Wallet</span>
          <button type="button" onClick={connectWallet} className="compact-button">
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
            <select
              value={routeId}
              onChange={(event) => setRouteId(event.target.value as typeof routeId)}
            >
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
            <p className="error fine">{validation.error}</p>
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
