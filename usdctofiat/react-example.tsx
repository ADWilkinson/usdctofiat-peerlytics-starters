/**
 * react-example.tsx
 *
 * Reference React component for @usdctofiat/offramp v2.
 * Copy-paste template — not runnable standalone.
 */

import { useOfframp } from "@usdctofiat/offramp/react";
import { PLATFORMS, CURRENCIES, OFFRAMP_ERROR_CODES } from "@usdctofiat/offramp";
import { useState } from "react";
// import { useWalletClient } from "wagmi"; // Your wallet library

export function OfframpWidget() {
  // const { data: walletClient } = useWalletClient();
  const walletClient = null as any; // Replace with your wallet hook

  const { offramp, step, lastError, isLoading } = useOfframp();

  const [amount, setAmount] = useState("100");
  const platform = PLATFORMS.REVOLUT;
  const currency = CURRENCIES.EUR;
  const [identifier, setIdentifier] = useState("");

  const handleSell = async () => {
    if (!walletClient) return;
    try {
      const result = await offramp(walletClient, {
        amount,
        platform,
        currency,
        identifier,
      });
      console.log(`Deposit #${result.depositId} ${result.resumed ? "resumed" : "created"}`);
    } catch (err) {
      // The hook already surfaces errors via `lastError`; the throw is for
      // callers that want to short-circuit their own flow.
      console.error(err);
    }
  };

  // Validation
  const validation = identifier ? platform.validate(identifier) : null;

  // In-progress
  if (step && step !== "done") {
    return (
      <div>
        <p>
          {step === "resuming" && "Resuming existing deposit..."}
          {step === "approving" && "Approve USDC in your wallet..."}
          {step === "registering" && "Registering payment details..."}
          {step === "depositing" && "Creating deposit..."}
          {step === "confirming" && "Waiting for confirmation..."}
          {step === "delegating" && "Delegating to vault..."}
          {step === "restricting" && "Restricting to OTC taker..."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSell(); }}>
      <input
        type="number"
        placeholder="USDC amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min="1"
      />
      <input
        placeholder={platform.identifier.placeholder}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      {validation && !validation.valid && (
        <p style={{ color: "red" }}>{validation.error}</p>
      )}
      <p>{platform.name} · {currency.code} ({currency.symbol})</p>
      <button type="submit" disabled={isLoading || !walletClient}>
        {isLoading ? "Creating..." : `Sell USDC for ${currency.symbol}`}
      </button>
      {lastError && lastError.code !== OFFRAMP_ERROR_CODES.USER_CANCELLED && (
        <p style={{ color: "red" }}>{lastError.message}</p>
      )}
    </form>
  );
}
