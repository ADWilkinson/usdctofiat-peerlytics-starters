# Peerlytics & USDCtoFiat Starters

Production-ready examples and a live demo for two SDKs that cover the ZKP2P protocol on Base: server-side analytics with **@peerlytics/sdk** and wallet-native USDC off-ramps with **@usdctofiat/offramp**.

[![npm: @peerlytics/sdk](https://img.shields.io/npm/v/@peerlytics/sdk?label=%40peerlytics%2Fsdk&color=1b5e4e)](https://www.npmjs.com/package/@peerlytics/sdk)
[![npm: @usdctofiat/offramp](https://img.shields.io/npm/v/@usdctofiat/offramp?label=%40usdctofiat%2Fofframp&color=6e4a0e)](https://www.npmjs.com/package/@usdctofiat/offramp)

**Live demo:** [offramp-sdk.vercel.app](https://offramp-sdk.vercel.app)

## What's in this repo

```text
demo/                        Vite + React demo app (deployed to Vercel)
  src/App.tsx                  single-page UI: create deposits, live orderbook, withdraw
  api/orderbook.ts             Vercel serverless orderbook proxy
  server/peerlytics.ts         shared Peerlytics server helper (dev + prod)

peerlytics/                  @peerlytics/sdk examples (run standalone with ts-node/bun)
  orderbook-snapshot.ts        multi-currency orderbook depth
  rate-monitor.ts              poll rates, alert on threshold
  volume-dashboard.ts          protocol stats terminal dashboard
  maker-report.ts              portfolio report for a maker address
  live-activity.ts             real-time protocol event stream (SSE)
  x402-agent.ts                x402 pay-per-request flow (no API key needed)
  llms.txt                     LLM-friendly SDK reference

usdctofiat/                  @usdctofiat/offramp examples
  create-deposit.ts            create and delegate a USDC deposit
  close-deposit.ts             withdraw remaining USDC and close a deposit
  resume-deposit.ts            resume an interrupted deposit flow
  otc-deposit.ts               create an OTC deposit restricted to a single taker
  manage-deposits.ts           list and inspect deposits for a wallet
  platform-explorer.ts         enumerate platforms, currencies, and validation
  react-example.tsx            useOfframp hook usage in React
  llms.txt                     LLM-friendly SDK reference

skills/                      Claude Code skills for AI-assisted development
  claude/
    query-peerlytics-data/     skill: query protocol data via Peerlytics SDK
    integrate-usdctofiat-offramp/  skill: integrate the offramp SDK
```

## Quick start

### Demo app

```bash
cd demo
npm install
cp .env.example .env.local
```

Grab a free API key at [peerlytics.xyz/developers](https://peerlytics.xyz/developers?tab=account) (1,000 requests/month included), then set it in `.env.local`:

```bash
PEERLYTICS_API_KEY=pk_live_...
```

```bash
npm run dev
```

### Standalone examples

Each script in `peerlytics/` and `usdctofiat/` runs independently:

```bash
# Peerlytics (server-side, get a free key at peerlytics.xyz/developers)
export PEERLYTICS_API_KEY=pk_live_...
npx tsx peerlytics/orderbook-snapshot.ts
npx tsx peerlytics/live-activity.ts

# USDCtoFiat (wallet-side, needs private key for tx examples)
npx tsx usdctofiat/platform-explorer.ts
```

## SDKs at a glance

### @peerlytics/sdk

Real-time analytics for the ZKP2P protocol. Orderbooks, activity feeds, maker stats, vault data.

```ts
import { Peerlytics } from "@peerlytics/sdk";

const client = new Peerlytics({ apiKey: "pk_live_..." });
const { orderbooks } = await client.getOrderbook({ currency: "USD", platform: "revolut" });
```

Auth options: [free API key](https://peerlytics.xyz/developers?tab=account) (1,000 requests/month included) or x402 pay-per-request with USDC on Base.

**A few gotchas worth knowing upfront** (SDK ≥ 0.4.0):

- List methods (`getActivity`, `getDeposits`, `getIntents`, `getMarketSummary`) return paginated envelopes like `{ events, count, hasMore, ... }` — iterate over `.events` / `.deposits` / etc, not the top-level result.
- `getDeposits()` needs at least one of `depositor`, `delegate`, `platform`, `currency`; `getIntents()` needs at least one of `owner`, `recipient`, `verifier`, `depositId`, `status`. Both throw `ValidationError` client-side if called empty.
- `DepositMarket.currency` / `deposit.currencies[].currency` are resolved ISO codes (e.g. `"GBP"`). `currencyCode` is the raw bytes32 hash — use `currency` for display.

[npm](https://www.npmjs.com/package/@peerlytics/sdk) | [API docs](https://peerlytics.xyz/developers) | [OpenAPI spec](https://peerlytics.xyz/api/openapi) | [llms.txt](https://peerlytics.xyz/llms.txt)

### @usdctofiat/offramp

Delegated USDC-to-fiat off-ramp on Base. Revolut, Venmo, Wise, PayPal, and more.

```ts
import { useOfframp, PLATFORMS, CURRENCIES } from "@usdctofiat/offramp/react";

const { offramp, deposits, close } = useOfframp();
await offramp(walletClient, {
  amount: "100",
  platform: PLATFORMS.REVOLUT,
  currency: CURRENCIES.USD,
  identifier: "alice",
});
```

Need a private order? Pass `otcTaker` to restrict the deposit to a single wallet — or use `enableOtc` / `disableOtc` / `getOtcLink` to retrofit restriction on an existing deposit. See `usdctofiat/otc-deposit.ts` for both paths.

Supported platforms: Revolut, Venmo, CashApp, Chime, Wise, Mercado Pago, Zelle, PayPal, Monzo, N26.

[npm](https://www.npmjs.com/package/@usdctofiat/offramp) | [usdctofiat.xyz](https://usdctofiat.xyz)

## Deploy the demo

The demo deploys to Vercel with root directory set to `demo/`.

```bash
cd demo
vercel link          # link to your Vercel project
vercel env add PEERLYTICS_API_KEY production
vercel env add PEERLYTICS_API_KEY preview
vercel --prod
```

The orderbook API key stays server-side and is never exposed to the browser.

## Links

- [Peerlytics Explorer](https://peerlytics.xyz/explorer)
- [ZKP2P Protocol](https://zkp2p.xyz)
- [@davyjones0x](https://x.com/davyjones0x)

## License

[MIT](LICENSE)
