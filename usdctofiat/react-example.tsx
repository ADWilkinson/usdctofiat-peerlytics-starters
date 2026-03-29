/**
 * react-example.tsx
 *
 * Reference React component showing how to integrate @usdctofiat/offramp
 * into a dApp. This is not runnable standalone -- it's a copy-paste template.
 *
 * Shows:
 *   - useOfframp hook for deposit creation
 *   - Platform/currency selection from SDK
 *   - Progress state rendering
 *   - Error handling with OfframpError codes
 *   - Deposit listing and withdrawal
 */

import { useOfframp, type OfframpError } from "@usdctofiat/offramp/react";
import { useState } from "react";
// Your wallet library provides this -- wagmi, privy, etc.
// import { useWalletClient } from "wagmi";

export function OfframpWidget() {
  // const { data: walletClient } = useWalletClient();
  const walletClient = null as any; // Replace with your wallet hook

  const {
    createDeposit,
    getDeposits,
    withdrawDeposit,
    step,
    txHash,
    depositId,
    error,
    isLoading,
    reset,
    getPlatforms,
    getCurrencies,
    validateIdentifier,
  } = useOfframp();

  // ── Form state ──────────────────────────────────────────────────

  const platforms = getPlatforms();
  const [platform, setPlatform] = useState(platforms[0]?.id ?? "revolut");
  const currencies = getCurrencies(platform);
  const [currency, setCurrency] = useState(currencies.includes("USD") ? "USD" : currencies[0]);
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("100");

  // ── Handlers ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!walletClient) return;
    try {
      const result = await createDeposit(walletClient, {
        amount,
        platform,
        currency,
        identifier,
      });
      console.log("Deposit created:", result.depositId);
    } catch (err) {
      const offrampError = err as OfframpError;
      if (offrampError.code === "USER_CANCELLED") return; // User rejected tx
      console.error("Offramp failed:", offrampError.message);
    }
  };

  // ── Validation ──────────────────────────────────────────────────

  const validation = identifier ? validateIdentifier(platform, identifier) : null;

  // ── Render ──────────────────────────────────────────────────────

  // During transaction
  if (step && step !== "done") {
    return (
      <div>
        <p>
          {step === "approving" && "Approve USDC in your wallet..."}
          {step === "registering" && "Registering payment details..."}
          {step === "depositing" && "Creating deposit..."}
          {step === "confirming" && "Waiting for confirmation..."}
          {step === "delegating" && "Delegating to vault..."}
        </p>
        {txHash && <p>Tx: {txHash.slice(0, 10)}...</p>}
      </div>
    );
  }

  // Success
  if (step === "done" && depositId) {
    return (
      <div>
        <h3>Deposit #{depositId} created</h3>
        <p>Your deposit is live and delegated.</p>
        <button onClick={reset}>Create another</button>
      </div>
    );
  }

  // Form
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <select value={platform} onChange={(e) => {
        setPlatform(e.target.value as typeof platform);
        setCurrency(getCurrencies(e.target.value as typeof platform)[0]);
      }}>
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {currencies.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        placeholder={platforms.find((p) => p.id === platform)?.identifierPlaceholder}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      {validation && !validation.valid && (
        <p style={{ color: "red" }}>{validation.error}</p>
      )}

      <input
        type="number"
        placeholder="USDC amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min="10"
      />

      <button type="submit" disabled={isLoading || !walletClient}>
        {isLoading ? "Creating..." : "Sell USDC"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
