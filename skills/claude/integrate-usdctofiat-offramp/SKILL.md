---
name: integrate-usdctofiat-offramp
description: Integrate the @usdctofiat/offramp SDK (v4.x) into a dApp to add USDC-to-fiat offramp functionality on Base. Use when asked to add an offramp, sell USDC for fiat, integrate USDCtoFiat, build a deposit flow, ship OTC private orders, or wire HMAC-signed deposit/otc lifecycle webhooks.
---

# Integrate USDCtoFiat Offramp (v4.x)

## Overview

Guide the user to integrate `@usdctofiat/offramp` v4.x. Surface area: 1 primary function (`offramp()`), deposit/OTC helpers (`deposits`, `close`, `enableOtc`, `disableOtc`, `getOtcLink`), taker-tier helpers (`getTakerTier`, `findTakerPlatformLimit`, `resolveTakerPlatformLimit`), Peer extension helpers (`getPeerExtensionRegistrationAuthParams`, `completePeerExtensionRegistration`), platform constants (`PLATFORMS`, `CURRENCIES`), developer resource exports (`OFFRAMP_DEVELOPER_RESOURCES`, `OFFRAMP_RESOURCE_LINKS`, `OFFRAMP_INTEGRATION_PLAYBOOKS`, `getOfframpDeveloperResources`), and 2 React hooks (`useOfframp`, `usePeerExtensionRegistration`).

Companion docs:

- Developer portal: https://usdctofiat.xyz/developers
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Bot guide: https://usdctofiat.xyz/developers/bots/
- Agent guide: https://usdctofiat.xyz/developers/agents/
- Webhooks guide: https://usdctofiat.xyz/developers/webhooks/
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

## Resource bundle

```typescript
import { OFFRAMP_DEVELOPER_RESOURCES, getOfframpDeveloperResources } from "@usdctofiat/offramp";

const allResources = OFFRAMP_DEVELOPER_RESOURCES;
const botPlaybook = getOfframpDeveloperResources("bot");
console.log(allResources.links.agentSkill, botPlaybook);
```

Use this export when generating docs, scaffolding apps, or giving coding agents
canonical links. It includes Base chain metadata, mandatory delegation config,
developer pages, the agent skill, `llms.txt`, starter repo, and Peerlytics
upgrade links.

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
// otcLink: share with the approved buyer
```

Retrofit OTC onto an existing public deposit:

```typescript
import { enableOtc, disableOtc, getOtcLink } from "@usdctofiat/offramp";

await enableOtc(walletClient, "362", "0xBuyerWallet");
await disableOtc(walletClient, "362"); // back to public orderbook
const link = getOtcLink("362"); // no tx, just the share URL
```

Buyer rejection happens at the `WhitelistPreIntentHook` contract before payment starts — non-approved wallets cannot signal intent.

## Dynamic taker tiers

Take-side UIs should fetch the buyer's live Curator tier before presenting a
fillable amount. Platform caps, cooldowns, and locks are dynamic and depend on
the taker's wallet:

```typescript
import { findTakerPlatformLimit, getTakerTier } from "@usdctofiat/offramp";

const tier = await getTakerTier({ owner: takerAddress });
const limit = findTakerPlatformLimit(tier, { platform: "paypal" });

if (limit?.isLocked) {
  // Hide/disable the platform until the user reaches the required tier.
  console.log(`PayPal unlocks at ${limit.minTierRequired} tier`);
} else {
  console.log(limit?.effectiveCapDisplay);
}
```

## PeerAuth seller registration

PayPal, Wise, Venmo, and Cash App makers may need to register their handle
inside the PeerAuth browser extension before the first deposit. The SDK throws
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
            <button onClick={peer.startRegistrationCapture} disabled={peer.busy}>
              {peer.info?.ctaLabel ?? "Register with Peer"}
            </button>
          )}
          {peer.capturedMetadata?.sarCredentialCapture?.credentialBundle && !peer.error && (
            <button onClick={() => peer.completeRegistration(walletClient, depositParams)}>
              Continue registration
            </button>
          )}
        </div>
      )}
    </>
  );
}
```

`startRegistrationCapture()` launches the headless Peer metadata capture; once
`capturedMetadata.sarCredentialCapture.credentialBundle` is present, call
`completeRegistration(walletClient, depositParams)` (it uploads the seller
credential and retries the deposit in one shot). Or just call `offramp()` again
with the same identifier after the handshake completes.

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

## Peer extension capture changes in v4

If you drive the re-exported `peerExtensionSdk` directly, v4 follows
`@zkp2p/sdk@0.5.8`. The upstream Peer extension removed the sidepanel onramp
contract entirely — `peerExtensionSdk.onramp()`, `getOnrampTransaction()`, and
`openSidebar()` are gone, along with the `PeerExtensionOnrampParams` /
`PeerOnrampPreparedTransaction*` types. Capture now goes through the headless
metadata bridge: register an `onMetadataMessage(callback)` listener, then call
`authenticate({ actionType: "transfer_<platform>", captureMode, platform, providerConfig })`.
Build the buyer-TEE proof from the captured message, prepare fulfill calldata
via `fulfillIntent.prepare`, and broadcast it with your wallet client. There is
no pull-recovery path — re-run `authenticate` for the active intent if a
callback is missed. `PeerSarCredentialBundle` is now an alias of `@zkp2p/sdk`'s
`SellerCredentialBundle`. Most integrators never touch this surface: the
`offramp()` function and the React hooks handle the whole flow.

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
- `EXTENSION_REGISTRATION_REQUIRED` — seller needs the PeerAuth registration handshake
- `DEPOSIT_FAILED` — escrow `createDeposit` transaction failed
- `CONFIRMATION_FAILED` — could not parse the deposit ID from receipt logs
- `DELEGATION_FAILED` — delegation transaction failed
- `USER_CANCELLED` — wallet popup rejected
- `UNSUPPORTED` — unsupported chain / wallet capability

## Webhooks

Subscribe to `deposit.*` and `otc.*` events at https://usdctofiat.xyz/developers/webhooks/
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

## v3 → v4 migration

If you drive `peerExtensionSdk` directly, the `onramp()`,
`getOnrampTransaction()`, and `openSidebar()` methods plus the
`PeerExtensionOnrampParams` / `PeerOnrampPreparedTransaction*` types are removed.
Migrate to the `@zkp2p/sdk@0.5.8` `authenticate()` + `onMetadataMessage()`
bridge. For seller registration use `captureMode: "sellerCredential"` via
`getPeerExtensionRegistrationAuthParams` / `completePeerExtensionRegistration`
(or the `usePeerExtensionRegistration` React hook). If you only use `offramp()`
and the React hooks, the deposit flow is unchanged — just bump the version.

## v1 → v2 migration

If migrating from `@usdctofiat/offramp@1.x`:

1. Re-prompt PayPal users for their `paypal.me` USERNAME (not email).
   `PLATFORMS.PAYPAL.validate(...)` accepts the username, `paypal.me/<user>`, or
   `@<user>` and rejects emails.
2. Handle the new `EXTENSION_REGISTRATION_REQUIRED` error on PayPal, Wise, Venmo, and Cash App via
   `usePeerExtensionRegistration(platform)`.
3. If you hand-rolled `POST /v1/makers/create`, switch to `POST /v2/makers/create`
   with `{ processorName, offchainId, telegramUsername? }`.

See the SDK [CHANGELOG migration guide](https://github.com/ADWilkinson/galleonlabs-zkp2p/blob/main/packages/offramp-sdk/CHANGELOG.md#200---2026-04-24).

## Links

- npm: https://www.npmjs.com/package/@usdctofiat/offramp
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
- App: https://usdctofiat.xyz
- Developer portal: https://usdctofiat.xyz/developers
