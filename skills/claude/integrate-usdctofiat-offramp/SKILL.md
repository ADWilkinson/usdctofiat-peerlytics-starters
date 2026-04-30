---
name: integrate-usdctofiat-offramp
description: Integrate the @usdctofiat/offramp SDK (v2.x) into a dApp to add USDC-to-fiat offramp functionality on Base. Use when asked to add an offramp, sell USDC for fiat, integrate USDCtoFiat, build a deposit flow, ship OTC private orders, or wire HMAC-signed deposit/otc lifecycle webhooks.
---

# Integrate USDCtoFiat Offramp (v2.x)

## Overview

Guide the user to integrate `@usdctofiat/offramp` v2.x. Surface area: 1 primary function (`offramp()`), 4 helpers (`deposits`, `close`, `enableOtc`, `disableOtc`, `getOtcLink`), 2 const objects (`PLATFORMS`, `CURRENCIES`), 2 React hooks (`useOfframp`, `usePeerExtensionRegistration`).

Companion docs:

- Developer portal: https://usdctofiat.xyz/developers
- llms-full.txt (canonical machine reference): https://usdctofiat.xyz/llms-full.txt
- Skill: https://usdctofiat.xyz/skills/usdctofiat.md
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
- Companion analytics SDK: `@peerlytics/sdk` (one Peerlytics API key authenticates both products)

## Install

```bash
bun add @usdctofiat/offramp
# or scaffold a working app:
npx create-offramp-app@latest my-offramp --template=next|vite|telegram-bot
```

React hooks live at the `/react` subpath: `import { useOfframp } from "@usdctofiat/offramp/react"`.

## Core pattern (server / Node / bot)

```typescript
import { offramp, PLATFORMS, CURRENCIES } from "@usdctofiat/offramp";

const result = await offramp(walletClient, {
  amount: "100", // USDC, decimal string, min 1
  platform: PLATFORMS.REVOLUT,
  currency: CURRENCIES.EUR,
  identifier: "alice", // platform-specific (Revtag / @username / paypal.me USERNAME / etc.)
  integratorId: "your-app", // ERC-8021 attribution
  referralId: "partner-123", // optional partner code
  idempotencyKey: `order-${orderId}`, // 10-min replay-protected
});
// { depositId: "362", txHash: "0x...", resumed: false, otcLink?: "..." }
```

## React pattern

```tsx
import { PLATFORMS, CURRENCIES, OFFRAMP_ERROR_CODES } from "@usdctofiat/offramp";
import { useOfframp } from "@usdctofiat/offramp/react";

function SellButton({ walletClient }) {
  const { offramp, step, isLoading, lastError } = useOfframp({ integratorId: "your-app" });

  if (lastError?.code === OFFRAMP_ERROR_CODES.USER_CANCELLED) {
    // No-op, user backed out.
  }

  return (
    <button
      disabled={isLoading}
      onClick={() =>
        offramp(walletClient, {
          amount: "100",
          platform: PLATFORMS.REVOLUT,
          currency: CURRENCIES.EUR,
          identifier: "alice",
        })
      }
    >
      {isLoading ? (step ?? "Working...") : "Sell 100 USDC"}
    </button>
  );
}
```

## OTC private orders

Pass `otcTaker` to lock a deposit to a single buyer wallet in one call:

```typescript
const { depositId, otcLink } = await offramp(walletClient, {
  amount: "250",
  platform: PLATFORMS.REVOLUT,
  currency: CURRENCIES.EUR,
  identifier: "alice",
  otcTaker: "0xBuyerWallet",
});
// otcLink: https://usdctofiat.xyz/deposit/<escrow>/<depositId> -- share with the approved buyer
```

Retrofit OTC onto an existing public deposit:

```typescript
import { enableOtc, disableOtc, getOtcLink } from "@usdctofiat/offramp";

await enableOtc(walletClient, "362", "0xBuyerWallet");
await disableOtc(walletClient, "362"); // back to public orderbook
const link = getOtcLink("362"); // no tx, just the share URL
```

Buyer rejection happens at the `WhitelistPreIntentHook` contract before payment starts — non-approved wallets cannot signal intent.

## PayPal + Wise (Peer extension handshake)

PayPal and Wise makers must register their handle inside the Peer (PeerAuth)
browser extension before the first deposit. v2 throws
`OfframpError` with code `EXTENSION_REGISTRATION_REQUIRED` when curator rejects
a maker for this reason. Drive recovery with the React hook:

```tsx
import { PLATFORMS, OFFRAMP_ERROR_CODES } from "@usdctofiat/offramp";
import { useOfframp, usePeerExtensionRegistration } from "@usdctofiat/offramp/react";

function PayPalSellButton({ walletClient }) {
  const { offramp, lastError } = useOfframp();
  const peer = usePeerExtensionRegistration(PLATFORMS.PAYPAL);
  const needsExt = lastError?.code === OFFRAMP_ERROR_CODES.EXTENSION_REGISTRATION_REQUIRED;

  return (
    <>
      <button
        onClick={() =>
          offramp(walletClient, {
            amount: "100",
            platform: PLATFORMS.PAYPAL,
            currency: CURRENCIES.USD,
            identifier: "alicepay", // PayPal.me USERNAME, NOT email
          })
        }
      >
        Sell USDC
      </button>

      {needsExt && (
        <div>
          <p>{peer.info?.requiredPrompt}</p>
          {peer.phase === "needs_install" && (
            <button onClick={peer.installExtension}>Install Peer Extension</button>
          )}
          {peer.phase === "needs_connection" && (
            <button onClick={peer.connectExtension} disabled={peer.busy}>
              Connect Peer Extension
            </button>
          )}
          {peer.phase === "ready" && (
            <button onClick={peer.openVerifySidebar}>Verify in Peer</button>
          )}
        </div>
      )}
    </>
  );
}
```

After the user completes the handshake, call `offramp()` again with the same
identifier.

## Deposit management

```typescript
import { deposits, close } from "@usdctofiat/offramp";

const list = await deposits("0xYourAddress");
// [{ depositId, status, remainingUsdc, paymentMethods, currencies, delegated, ... }]

await close(walletClient, "362"); // withdraw remaining USDC and close
```

## Resumable flow

`offramp()` is idempotent. Before creating a new deposit it checks for an
existing undelegated deposit on the wallet and resumes from delegation if
found. Handles browser crashes, failed delegation, and retries automatically —
just call `offramp()` again.

## Error handling

```typescript
import { OfframpError, OFFRAMP_ERROR_CODES } from "@usdctofiat/offramp";

try {
  await offramp(walletClient, params);
} catch (err) {
  if (err instanceof OfframpError) {
    switch (err.code) {
      case OFFRAMP_ERROR_CODES.USER_CANCELLED:
        return;
      case OFFRAMP_ERROR_CODES.EXTENSION_REGISTRATION_REQUIRED:
        // Walk the user through usePeerExtensionRegistration() then retry.
        return;
      default:
        // Generic recovery: call offramp() again — undelegated deposits resume.
        console.error(err.code, err.step, err.txHash, err.depositId, err.message);
    }
  }
}
```

Error codes:

- `VALIDATION` — invalid parameter shape or unsupported platform/currency pair
- `APPROVAL_FAILED` — USDC allowance transaction failed
- `REGISTRATION_FAILED` — `POST /v2/makers/create` rejected (non-extension reason)
- `EXTENSION_REGISTRATION_REQUIRED` — PayPal / Wise maker needs the Peer extension handshake
- `DEPOSIT_FAILED` — escrow `createDeposit` transaction failed
- `CONFIRMATION_FAILED` — could not parse the deposit ID from receipt logs
- `DELEGATION_FAILED` — delegation transaction failed
- `USER_CANCELLED` — wallet popup rejected
- `UNSUPPORTED` — unsupported chain / wallet capability

## Webhooks

Subscribe to `deposit.*` and `otc.*` events at https://usdctofiat.xyz/developers
with your Peerlytics API key. Webhook registration is Pro-only; the same
`paid-api-keys` Firestore collection serves both products.

Events: `deposit.created`, `deposit.filled`, `deposit.partially_filled`,
`deposit.closed`, `otc.taken` (live); `otc.enabled`, `otc.disabled` (reserved).

Delivery headers:

- `X-Usdctofiat-Signature: t=<unix>,v1=<hex>` — HMAC-SHA256 over `${t}.${rawBody}`
- `X-Usdctofiat-Event: <event_name>`
- `X-Usdctofiat-Delivery-Id: <uuid>` — dedupe key (single-attempt delivery)

Reference verifier (Node, ~150 LOC, `node:crypto` only):
[`usdctofiat/webhook-receiver.ts`](https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/blob/main/usdctofiat/webhook-receiver.ts).

## Constraints

- Base mainnet only (chain ID 8453)
- Minimum deposit: 1 USDC
- Requires a viem `WalletClient` with an account
- All deposits delegate to the Delegate vault (mandatory — pricing is managed)
- Rate mode is `track_market` (vault oracle handles quoting)
- Attribution: ERC-8021, builder code `usdctofiat` baked in via `replaceAttribution`

## v1 → v2 migration

If migrating from `@usdctofiat/offramp@1.x`:

1. Re-prompt PayPal users for their `paypal.me` USERNAME (not email).
   `PLATFORMS.PAYPAL.validate(...)` accepts the username, `paypal.me/<user>`, or
   `@<user>` and rejects emails.
2. Handle the new `EXTENSION_REGISTRATION_REQUIRED` error on PayPal + Wise via
   `usePeerExtensionRegistration(platform)`.
3. If you hand-rolled `POST /v1/makers/create`, switch to `POST /v2/makers/create`
   with `{ processorName, offchainId, telegramUsername? }`.

See the SDK [CHANGELOG migration guide](https://github.com/ADWilkinson/galleonlabs-zkp2p/blob/main/packages/offramp-sdk/CHANGELOG.md#200---2026-04-24).

## Links

- npm: https://www.npmjs.com/package/@usdctofiat/offramp
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
- App: https://usdctofiat.xyz
- Developer portal: https://usdctofiat.xyz/developers
