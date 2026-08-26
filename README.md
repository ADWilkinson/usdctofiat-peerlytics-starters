# Peerlytics & USDCtoFiat Starters

Examples and a live demo for the two SDKs covering ZKP2P on Base: server-side protocol data with **@peerlytics/sdk** and wallet-native USDC off-ramps with **@usdctofiat/offramp**.

[![npm: @peerlytics/sdk](https://img.shields.io/npm/v/@peerlytics/sdk?label=%40peerlytics%2Fsdk&color=1b5e4e)](https://www.npmjs.com/package/@peerlytics/sdk)
[![npm: @usdctofiat/offramp](https://img.shields.io/npm/v/@usdctofiat/offramp?label=%40usdctofiat%2Fofframp&color=6e4a0e)](https://www.npmjs.com/package/@usdctofiat/offramp)

**Live demo:** [offramp-sdk.vercel.app](https://offramp-sdk.vercel.app)
**Developer portals:** [usdctofiat.xyz/developers](https://usdctofiat.xyz/developers) · [peerlytics.xyz/developers](https://peerlytics.xyz/developers)
**Workshop:** [by Galleon](https://galleonlabs.io/fleet/starter-kits)

## 60-second cash-out

```ts
import { cashout } from "@usdctofiat/offramp";

const { depositId, txHash } = await cashout({
  mode: "fast",
  signer: walletClient,
  amount: "100",
  platform: "revolut",
  currency: "EUR",
  payee: "alice",
});
```

That call creates a direct Peer Cash order on Base at the live oracle rate. Choose `mode: "best"` instead to delegate pricing to the managed rate manager. Settlement runs on Revolut, Venmo, Wise, Cash App, Zelle, Monzo, or PayPal — your users never leave your app. Persist `depositId` immediately so the order can be resumed from another process or device.

Need a fresh app skeleton instead of dropping into an existing one?

```bash
npx create-offramp-app@latest my-offramp --template=next         # next | base-mini-app | vite | telegram-bot
```

**Agent skills (Claude Code, Cursor):** [`integrate-usdctofiat-offramp`](skills/claude/integrate-usdctofiat-offramp/SKILL.md) · [`query-peerlytics-data`](skills/claude/query-peerlytics-data/SKILL.md). For other assistants, hand them the canonical `llms-full.txt`: [usdctofiat.xyz/llms-full.txt](https://usdctofiat.xyz/llms-full.txt) · [peerlytics.xyz/llms-full.txt](https://peerlytics.xyz/llms-full.txt).

## What's in this repo

```text
demo/                        Vite + React demo app (deployed to Vercel)
  src/App.tsx                  single-page UI: create deposits, live orderbook, withdraw
  api/orderbook.ts             Vercel serverless orderbook proxy
  server/peerlytics.ts         shared Peerlytics server helper (dev + prod)

peerlytics/                  @peerlytics/sdk examples (run standalone with tsx/bun)
  orderbook-snapshot.ts        multi-currency orderbook depth
  rate-monitor.ts              poll rates, alert on threshold
  volume-dashboard.ts          protocol stats terminal dashboard
  maker-report.ts              portfolio report for a maker address
  integrator-report.ts         ERC-8021 integrator stats (deposits, volume, top markets)
  timeseries-chart.ts          hourly/daily rollups in a terminal sparkbar chart
  live-activity.ts             near-real-time protocol activity polling feed
  x402-agent.ts                x402 pay-per-request flow (no API key needed)
  llms.txt                     LLM-friendly SDK reference

usdctofiat/                  @usdctofiat/offramp examples
  create-deposit.ts            cash out USDC in managed best mode
  close-deposit.ts             withdraw remaining USDC and close a deposit
  resume-deposit.ts            resume an interrupted deposit flow
  otc-deposit.ts               create an OTC deposit restricted to a single taker
  manage-deposits.ts           list and inspect deposits for a wallet
  platform-explorer.ts         enumerate platforms, currencies, and validation
  paypal-deposit.ts            PayPal flow — paypal.me username + Peer extension fallback
  react-example.tsx            useOfframp hook usage in React (Revolut)
  paypal-react-example.tsx     useOfframp + usePeerExtensionRegistration handshake
  developer-resources.ts       print SDK links, delegation config, and app/bot/agent playbooks
  llms.txt                     LLM-friendly SDK reference

templates/                   Scaffold-ready integrations (used by create-offramp-app)
  next/                        Next.js 16 App Router + Privy
  base-mini-app/               Next.js 16 + Base Account compact cash-out app
  vite/                        Vite + React 19 + viem
  telegram-bot/                Node 22 + grammy + viem (server-side maker bot)
  README.md                    template selection + v1/v2 upgrade notes

skills/                      Claude Code skills for AI-assisted development
  claude/
    query-peerlytics-data/         skill: query protocol data via Peerlytics SDK
    integrate-usdctofiat-offramp/  skill: integrate the offramp SDK
```

## Run the examples

Each script under `peerlytics/` and `usdctofiat/` runs standalone:

```bash
# Peerlytics (server-side, free key includes 1,000 requests/month)
export PEERLYTICS_API_KEY=pk_live_...
npx tsx peerlytics/orderbook-snapshot.ts
npx tsx peerlytics/live-activity.ts

# USDCtoFiat (wallet-side, needs a private key for tx examples)
npx tsx usdctofiat/platform-explorer.ts
```

The deposit scripts default to the public Base RPC. Set `RPC_URL` to a private
endpoint (Alchemy, QuickNode, etc.) to avoid rate limits on real deposit runs.

Get a free API key at [peerlytics.xyz/developers](https://peerlytics.xyz/developers?tab=account) for the Peerlytics paid API. Lifecycle state now lives in the explorer, activity stream, and deposit/intent reads.

## Run the demo locally

```bash
cd demo
npm install
cp .env.example .env.local         # set PEERLYTICS_API_KEY
npm run dev
```

Deploy to Vercel:

```bash
cd demo
vercel link                                # link to your Vercel project
vercel env add PEERLYTICS_API_KEY production
vercel env add PEERLYTICS_API_KEY preview
vercel --prod
```

The orderbook API key stays server-side and is never exposed to the browser.

## Start a real app

Choose the smallest starter that matches where the cash-out flow will live:

| Starter | Use it when | Required env |
|---|---|---|
| `next` | You want a production web app with Privy wallet auth | `NEXT_PUBLIC_PRIVY_APP_ID` |
| `base-mini-app` | You are distributing a compact Base Account cash-out surface | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_BUILDER_CODE` |
| `vite` | You want a lean SPA without Next.js conventions | `VITE_PRIVY_APP_ID` |
| `telegram-bot` | You are running a server-side maker bot with a managed wallet | `TELEGRAM_BOT_TOKEN`, `MAKER_PRIVATE_KEY`, `AUTHORIZED_TELEGRAM_USER_ID` |

The v8 flat `cashout()` helper applies the package's fixed USDCtoFiat attribution automatically; it does not need an integrator or referral environment variable.

## SDKs at a glance

### @peerlytics/sdk

Server-side data on the ZKP2P protocol — orderbooks, activity feeds, maker portfolios, vault stats.

```ts
import { Peerlytics } from "@peerlytics/sdk";

const client = new Peerlytics({ apiKey: "pk_live_..." });
const { orderbooks } = await client.getOrderbook({ currency: "USD", platform: "revolut" });
```

Auth: [free API key](https://peerlytics.xyz/developers?tab=account) (1,000 requests/month) or x402 pay-per-request with USDC on Base. SDK ≥ 1.0 can drive x402 directly with `auth: { mode: "x402", signer }`.

**Gotchas worth knowing** (SDK 3.x, Stripe-style v2 wire format):

- List methods (`getActivity`, `getDeposits`, `getIntents`, `getMarketSummary`) return paginated envelopes like `{ events, count, hasMore, ... }` — iterate over `.events` / `.deposits` / etc, not the top-level result.
- `getDeposits()` requires at least one of `depositor`, `delegate`, `platform`, `currency`; `getIntents()` requires at least one of `owner`, `recipient`, `verifier`, `depositId`, `status`. Both throw `ValidationError` client-side if called empty.
- `getOrderbook()` returns only publicly takeable liquidity. Passing `taker` adds the gated deposits that wallet can actually fill — resolved from per-address whitelists *and* AddressGroupRegistry membership — and reports the unlocking groups in `filters.applied.takerGroupIds`.
- `getTaker()` exposes `cancelledVolumeUsd`; the old `lockScore` label was removed in SDK 3. Taker `tier`/`tierSource` are verified address-group labels and imply no order cap.
- `DepositMarket.currency` / `deposit.currencies[].currency` are resolved ISO codes (e.g. `"GBP"`). `currencyCode` is the raw bytes32 hash — use `currency` for display.
- Key management uses the opaque `id` from `listKeys()` (not the raw key): `deleteKey(id)`, `rotateKey(idOrKey)`, `createKey(label?)`.
- Some timestamp fields (`ApiKeyInfo.createdAt`, `lastUsedAt`, `freeCreditsResetAt`) are typed `number | string` — v2 emits Unix seconds (integer); convert with `Number(value) * 1000` to get a JS `Date`.

[npm](https://www.npmjs.com/package/@peerlytics/sdk) · [Developer portal](https://peerlytics.xyz/developers) · [OpenAPI spec](https://peerlytics.xyz/api/openapi) · [llms.txt](https://peerlytics.xyz/llms.txt)

### @usdctofiat/offramp

Non-custodial USDC-to-fiat cash-out on Base. Revolut, Venmo, Wise, PayPal, Cash App, Zelle, Monzo, and more.

```ts
import { cashout } from "@usdctofiat/offramp";

const order = await cashout({
  mode: "best",
  signer: walletClient,
  amount: "100",
  platform: "revolut",
  currency: "USD",
  payee: "alice",
});
```

Use `mode: "fast"` for the direct 0 bps oracle-spread route or `mode: "best"` for the Delegate-managed route. Pass `otcTaker` to restrict a cash-out to one buyer wallet. The legacy managed EscrowV2 helpers remain available as an explicit compatibility surface; see `usdctofiat/otc-deposit.ts` and the package's managed-v5 migration guide.

**PayPal, Wise, Venmo, and Cash App** makers may need to register their handle in the PeerAuth browser extension before the first deposit. The SDK throws `EXTENSION_REGISTRATION_REQUIRED` and ships `usePeerExtensionRegistration(platform)` to drive the install / connect / verify flow. See `usdctofiat/paypal-react-example.tsx` and `usdctofiat/paypal-deposit.ts` for the PayPal-shaped recovery pattern. PayPal uses the `paypal.me` **username**, not the account email.

Supported platforms: Venmo, Cash App, Chime, Revolut, Wise, Mercado Pago, Zelle, PayPal, Monzo.

[npm](https://www.npmjs.com/package/@usdctofiat/offramp) · [Developer portal](https://usdctofiat.xyz/developers) · [SDK guide](https://usdctofiat.xyz/developers/offramp-sdk/)

The SDK also exports the canonical self-serve resource bundle, so apps, bots, CLIs, and coding agents do not need to hardcode docs URLs:

```ts
import { OFFRAMP_DEVELOPER_RESOURCES, getOfframpDeveloperResources } from "@usdctofiat/offramp";

console.log(OFFRAMP_DEVELOPER_RESOURCES.links.agentSkill);
console.log(getOfframpDeveloperResources("bot"));
```

Run `npx tsx usdctofiat/developer-resources.ts` or `npx tsx usdctofiat/developer-resources.ts agent` to print the full map.

## Links

- [usdctofiat.xyz/developers](https://usdctofiat.xyz/developers) — self-serve developer hub
- [usdctofiat.xyz/developers/offramp-sdk](https://usdctofiat.xyz/developers/offramp-sdk/) — SDK guide
- [How USDC to fiat works](https://usdctofiat.xyz/usdc-to-fiat/) — what your users get: methods, currencies, fees
- [Base USDC](https://usdctofiat.xyz/learn/base-usdc/) — the exact token the off-ramp sells (native, not USDbC)
- [peerlytics.xyz/developers](https://peerlytics.xyz/developers) — analytics SDK + API key dashboard
- [Peerlytics Explorer](https://peerlytics.xyz/) — protocol explorer and market intel
- [ZKP2P Protocol](https://zkp2p.xyz)
- [@andrewwilkinson](https://x.com/andrewwilkinson)

## License

[MIT](LICENSE)
