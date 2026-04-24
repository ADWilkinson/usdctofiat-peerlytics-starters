/**
 * paypal-react-example.tsx
 *
 * PayPal and Wise makers must register their handle inside the Peer
 * (PeerAuth) browser extension before curator's /v2/makers/create will
 * accept the deposit. This example demonstrates how to catch the
 * EXTENSION_REGISTRATION_REQUIRED error from @usdctofiat/offramp v2 and
 * walk the user through the install → connect → verify handshake via
 * the usePeerExtensionRegistration hook.
 *
 * Copy-paste template — not runnable standalone.
 */

import { useState } from "react";
import { PLATFORMS, CURRENCIES, OFFRAMP_ERROR_CODES } from "@usdctofiat/offramp";
import { useOfframp, usePeerExtensionRegistration } from "@usdctofiat/offramp/react";
// import { useWalletClient } from "wagmi"; // Your wallet library

export function PayPalSellForm() {
  // const { data: walletClient } = useWalletClient();
  const walletClient = null as any; // Replace with your wallet hook

  const { offramp, lastError, isLoading, step } = useOfframp();
  const peer = usePeerExtensionRegistration(PLATFORMS.PAYPAL);

  const [amount, setAmount] = useState("100");
  // PayPal identifier is the PayPal.me USERNAME — not the account email.
  // The SDK accepts any accepted shape (`paypal.me/alice`, `@alice`, `alice`)
  // and normalizes to the bare lowercase username.
  const [identifier, setIdentifier] = useState("");

  const validation = identifier ? PLATFORMS.PAYPAL.validate(identifier) : null;

  const handleSell = async () => {
    if (!walletClient) return;
    try {
      const result = await offramp(walletClient, {
        amount,
        platform: PLATFORMS.PAYPAL,
        currency: CURRENCIES.USD,
        identifier,
      });
      console.log(`Deposit #${result.depositId} created`);
    } catch (err) {
      // lastError is already surfaced by the hook — the throw is for callers
      // that want to short-circuit their own flow. See the render below for
      // the extension-registration CTA.
      console.error(err);
    }
  };

  const needsExtension =
    lastError?.code === OFFRAMP_ERROR_CODES.EXTENSION_REGISTRATION_REQUIRED;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSell();
      }}
    >
      <label>
        USDC amount
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <label>
        {PLATFORMS.PAYPAL.identifier.label}
        <input
          placeholder={PLATFORMS.PAYPAL.identifier.placeholder}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <small>{PLATFORMS.PAYPAL.identifier.help}</small>
      </label>
      {validation && !validation.valid && (
        <p style={{ color: "red" }}>{validation.error}</p>
      )}

      <button type="submit" disabled={isLoading || !walletClient}>
        {isLoading ? (step ?? "Working…") : "Sell USDC for USD"}
      </button>

      {needsExtension && peer.info && (
        <div
          role="status"
          style={{
            border: "1px solid #ddd",
            background: "#fafafa",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          <p>{peer.info.requiredPrompt}</p>

          {peer.phase === "checking" && <p>Checking Peer extension…</p>}

          {peer.phase === "needs_install" && (
            <button type="button" onClick={peer.installExtension}>
              {peer.info.ctaLabel}
            </button>
          )}

          {peer.phase === "needs_connection" && (
            <button
              type="button"
              disabled={peer.busy}
              onClick={() => peer.connectExtension()}
            >
              {peer.busy ? "Waiting for approval…" : "Connect Peer Extension"}
            </button>
          )}

          {peer.phase === "ready" && (
            <button type="button" onClick={() => peer.openVerifySidebar()}>
              Verify PayPal in Peer
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              peer.refresh();
              handleSell(); // retry makers/create after the user verified
            }}
          >
            I have completed verification
          </button>

          {peer.info.ctaSubtext && <small>{peer.info.ctaSubtext}</small>}
          {peer.error && <p style={{ color: "red" }}>{peer.error}</p>}
        </div>
      )}

      {lastError &&
        !needsExtension &&
        lastError.code !== OFFRAMP_ERROR_CODES.USER_CANCELLED && (
          <p style={{ color: "red" }}>{lastError.message}</p>
        )}
    </form>
  );
}
