---
name: integrate-usdctofiat-offramp
description: Integrate the @usdctofiat/offramp SDK into a dApp to add USDC-to-fiat offramp functionality. Use when asked to add an offramp, sell USDC for fiat, integrate USDCtoFiat, or build a deposit flow.
---

# Integrate USDCtoFiat Offramp

## Overview

Guide the user to integrate `@usdctofiat/offramp` into their dApp. The SDK creates delegated USDC-to-fiat deposits on Base in a single function call. Every deposit is automatically delegated to the Delegate vault for oracle-based rate management.

## When to use

- User asks to add a USDC offramp to their app
- User wants to sell USDC for fiat (EUR, GBP, USD, etc.)
- User mentions USDCtoFiat, offramp, or fiat withdrawal
- User is building a deposit or sell flow on Base

## Installation

```bash
npm install @usdctofiat/offramp
```

The SDK has no required configuration. All protocol addresses, vault config, and attribution are hardcoded.

## Core pattern — framework-agnostic

```typescript
import { Offramp } from "@usdctofiat/offramp";

const offramp = new Offramp();

// Create a deposit
const result = await offramp.createDeposit(walletClient, {
  amount: "100",        // USDC (min 1)
  platform: "revolut",  // Payment platform
  currency: "EUR",      // Fiat currency
  identifier: "alice",  // Platform username/email
});
// result: { depositId: "42", txHash: "0x..." }
```

## Core pattern — React

```typescript
import { useOfframp } from "@usdctofiat/offramp/react";
import type { OfframpError } from "@usdctofiat/offramp";

function SellButton({ walletClient }) {
  const { createDeposit, step, isLoading, error, reset } = useOfframp();

  const handleSell = async () => {
    try {
      await createDeposit(walletClient, {
        amount: "100",
        platform: "revolut",
        currency: "EUR",
        identifier: "alice",
      });
    } catch (err) {
      const offrampError = err as OfframpError;
      if (offrampError.code === "USER_CANCELLED") return;
      console.error(offrampError.message);
    }
  };

  if (step && step !== "done") {
    return <p>{step}...</p>;
  }

  return <button onClick={handleSell} disabled={isLoading}>Sell USDC</button>;
}
```

## Transaction flow

`createDeposit` executes 3 wallet signatures in sequence:

1. **Approve** — USDC allowance on the escrow contract
2. **Deposit** — On-chain deposit creation with payment method and currency
3. **Delegate** — Assign to the Delegate vault for rate management

Each step triggers a wallet popup. Use the `onProgress` callback to show users which step is active.

## Progress tracking

```typescript
await offramp.createDeposit(walletClient, params, (progress) => {
  // progress.step: "approving" | "registering" | "depositing" | "confirming" | "delegating" | "done"
  // progress.txHash: available after depositing
  // progress.depositId: available after confirming
  updateUI(progress.step);
});
```

## Deposit management

```typescript
// List deposits (read-only, no wallet needed)
const deposits = await offramp.getDeposits("0xWalletAddress");
// Returns: DepositInfo[] with status, remainingUsdc, fulfilledIntents, delegated, etc.

// Close and withdraw
const txHash = await offramp.withdrawDeposit(walletClient, "42");
```

## Platform discovery

```typescript
const platforms = offramp.getPlatforms();
// [{ id: "revolut", name: "Revolut", currencies: ["USD","EUR",...], identifierLabel: "Revtag", ... }]

const currencies = offramp.getCurrencies("wise");
// ["USD", "EUR", "GBP", ...]

const result = offramp.validateIdentifier("revolut", "@alice");
// { valid: true, normalized: "alice" }
```

## Error handling

```typescript
import { OfframpError } from "@usdctofiat/offramp";

try {
  await offramp.createDeposit(walletClient, params);
} catch (err) {
  if (err instanceof OfframpError) {
    switch (err.code) {
      case "USER_CANCELLED": return; // silently reset
      case "VALIDATION": showError(err.message); break;
      case "DELEGATION_FAILED":
        // Deposit exists but isn't delegated
        showWarning(`Deposit ${err.depositId} created. Manage at usdctofiat.xyz`);
        break;
      default: showError(err.message);
    }
  }
}
```

## Key constraints

- **Base network only** (chain ID 8453)
- **Minimum deposit**: 1 USDC
- **Order limits**: 1 USDC min, deposit amount max
- **Wallet**: requires a viem `WalletClient` with an account (wagmi, privy, or raw viem)
- **Delegation**: mandatory — every deposit delegates to the Delegate vault
- **Rate management**: handled by the vault oracle (no manual rate setting)
- **Auto-close**: deposits close when fully filled

## Supported platforms

Revolut (23 currencies) · Wise (30+) · PayPal (7) · Venmo · Cash App · Zelle · Monzo · N26 · Chime · Mercado Pago

## Links

- npm: https://www.npmjs.com/package/@usdctofiat/offramp
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
- App: https://usdctofiat.xyz
