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

const INTEGRATOR_ID = "__INTEGRATOR_ID__";
const REFERRAL_ID = "TODO_SET_REFERRAL_ID";
const resourceLinks = [
  ["SDK guide", OFFRAMP_DEVELOPER_RESOURCES.links.sdkGuide],
  ["App guide", OFFRAMP_DEVELOPER_RESOURCES.links.appGuide],
  ["Webhooks", OFFRAMP_DEVELOPER_RESOURCES.links.webhooksGuide],
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
      <h1>Offramp Vite Starter</h1>
      <p className="muted">Integrator: {INTEGRATOR_ID}</p>
      <p className="muted max-copy">
        Uses {OFFRAMP_DEVELOPER_RESOURCES.packageName} v
        {OFFRAMP_DEVELOPER_RESOURCES.sdkVersion} on Base. Deposits are wallet-signed
        and must delegate to the managed rate manager.
      </p>

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
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <label>
                USDC amount
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label>
                Venmo username
                <input
                  placeholder={PLATFORMS.VENMO.identifier.placeholder}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </label>
              {validation && !validation.valid ? (
                <p className="error">{validation.error}</p>
              ) : null}
              <button className="btn-primary" disabled={!canSubmit} type="submit">
                {isSubmitting ? "Creating..." : `Sell ${amount || "0"} USDC`}
              </button>
            </form>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              Connect a wallet to start an offramp.
            </p>
          )}
          {submitMessage ? <p className="muted">{submitMessage}</p> : null}
        </div>
      </section>

      <section className="resource-panel">
        <h2>Canonical resources</h2>
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
