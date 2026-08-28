---
name: integrate-usdctofiat-offramp
description: Integrate @usdctofiat/offramp v8 into an app, bot, or agent for Base USDC cash-out. Use when adding an offramp, selling USDC for fiat, choosing fast or best routing, building private OTC orders, onboarding verified payees, or connecting cash-out activity to Peerlytics.
---

# Integrate USDCtoFiat Offramp v8

Use `cashout()` as the default integration path. Require callers to choose
`mode: "fast"` or `mode: "best"`; never silently choose a mode for them.

## Install

```bash
npm install @usdctofiat/offramp viem
```

Require Node 22+, viem 2.x, and a connected viem `WalletClient` on Base.

## Ship the first cash-out

```typescript
import { cashout } from "@usdctofiat/offramp";
import type { WalletClient } from "viem";

export async function sellUsdc(signer: WalletClient) {
  const order = await cashout({
    mode: "fast",
    signer,
    amount: "100",
    currency: "EUR",
    platform: "revolut",
    payee: "alice",
  });

  // Persist this immediately; it is the cross-device/process resume key.
  console.log(order.depositId);
  return order;
}
```

Treat strings and numbers as human USDC amounts. Treat a `bigint` as exact
six-decimal base units. Validate free-form handles before submitting:

```typescript
import { PLATFORMS } from "@usdctofiat/offramp";

const validation = PLATFORMS.REVOLUT.validate(input);
if (!validation.valid) throw new Error(validation.error);
const payee = validation.normalized;
```

## Choose the mode explicitly

- Use `fast` for the direct Peer Cash route at the live oracle rate with 0 bps
  spread. Its composite `depositId` works with `createOfframp().order()`,
  `.watch()`, and `.withdraw()`.
- Use `best` for Delegate-managed pricing. It returns a numeric EscrowV2
  `depositId` that works with `deposits()` and `close()`, and has a 10 bps fill
  fee.

Never infer that `best` is always cheaper or that `fast` always settles first;
the names identify routing policies, not a guaranteed outcome.

## Follow and recover a fast order

```typescript
import { createOfframp } from "@usdctofiat/offramp";

const cash = createOfframp();

for await (const order of cash.watch(depositId)) {
  console.log(order.state, order.explain());
  if (!order.isInFlight) break;
}
```

Use the advanced client for estimates, multiple payout routes, order history,
Relay source routing, withdrawals, top-ups, and unsigned transaction
preparation. Keep the client stable across React renders. React hooks live at
`@usdctofiat/offramp/react`: `useEstimate`, `useCashout`, `useOrder`, and
`useOrders`.

## Create a private OTC cash-out

offramp 9 rejects `otcTaker` on fresh creation with `UNSUPPORTED`. The protocol
cannot create a deposit paused and private atomically, so a one-call private
order would leave a public window open between creation and restriction.
Restrict the deposit after it confirms instead:

```typescript
import { cashout, enableOtc, getOtcLink } from "@usdctofiat/offramp";

const order = await cashout({
  mode: "fast",
  signer,
  amount: "250",
  currency: "EUR",
  platform: "revolut",
  payee: "alice",
});

const { otcLink } = await enableOtc(signer, order.depositId, "0xBuyerWallet");
console.log(otcLink, getOtcLink(order.depositId));
```

Reopen the deposit with `disableOtc(signer, depositId, {})`; the options
argument is required in v9. Both helpers resolve the exact payment-method set
from ProtocolViewer and fail before any policy write when that projection is
stale, partial, or contradictory. If restriction fails after cash-out creation,
preserve the returned `depositId` and `txHash` and retry `enableOtc()`; do not
create a second order.

## Gate a payment rail

Pass `disabledPlatforms` to `cashout()` or `createOfframp()` to drop rails from
capability discovery and reject them before any new deposit. Cash App ships
disabled by default in `OFFRAMP_DISABLED_PAYMENT_PLATFORMS`; read
`DISABLED_PAYMENT_PLATFORM_MESSAGE` for the user-facing copy and check a rail
with `isPaymentPlatformDisabled(platform, disabledPlatforms)`.

## Handle errors

```typescript
import { CashError, OfframpError, cashout } from "@usdctofiat/offramp";

try {
  await cashout(input);
} catch (error) {
  if (error instanceof CashError) {
    console.error(error.code, error.retryable, error.remediation);
  } else if (error instanceof OfframpError) {
    console.error(error.code, error.depositId, error.txHash);
  }
  throw error;
}
```

Present the typed remediation to the user, preserve any order identifiers on
the error, and retry only when the error marks the operation retryable.

## Onboard verified payees

Use `createOfframp().registerPayee()` for extension-verified handles, then
reuse the returned handle in `cashout()`. Consult the current verified-payees
guide before implementing PayPal, Wise, Venmo, or Cash App onboarding; their
extension requirements can change independently of an app's UI.

## Keep managed v5 flows explicit

Use the compatibility API only when automatic Delegate-vault management or a
legacy EscrowV2 lifecycle is specifically required:

```typescript
import {
  CURRENCIES,
  PLATFORMS,
  createManagedOfframp,
} from "@usdctofiat/offramp/managed";

const managed = createManagedOfframp({ walletClient });
await managed.createDeposit({
  amount: "100",
  currency: CURRENCIES.EUR,
  platform: PLATFORMS.REVOLUT,
  identifier: "alice",
});
```

Do not present the compatibility `offramp()` helper, `useOfframp()` hook, or
`createManagedOfframp()` factory as the v8 golden path.

## Preserve attribution and resources

The v8 distribution automatically applies `peer-ref-TOFIAT` and
`galleonlabs`. Do not pass the removed v5 `integratorId` or `referralId` fields
to the flat `cashout()` input. Advanced clients may append an analytics code
with `createOfframp({ referrer: "my-wallet" })`; they cannot replace the fixed
financial referral.

Use the package resource exports instead of hardcoding integration links:

```typescript
import {
  OFFRAMP_DEVELOPER_RESOURCES,
  getOfframpDeveloperResources,
} from "@usdctofiat/offramp";

console.log(OFFRAMP_DEVELOPER_RESOURCES.links.sdkGuide);
console.log(getOfframpDeveloperResources("bot"));
```

## Verify

- Confirm the signer is on Base mainnet (chain ID 8453).
- Validate the amount and payout handle before wallet activity.
- Persist `depositId` immediately after success.
- Exercise the selected mode with a small real order before release.
- Use Peerlytics or the explorer to confirm the resulting order/deposit.

## References

- Developer portal: https://usdctofiat.xyz/developers
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- Canonical machine reference: https://usdctofiat.xyz/llms-full.txt
- Canonical skill: https://usdctofiat.xyz/skills/usdctofiat.md
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
- Peerlytics: https://peerlytics.xyz/developers
