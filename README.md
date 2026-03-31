# USDCtoFiat & Peerlytics Starters

[![npm @usdctofiat/offramp](https://img.shields.io/npm/v/@usdctofiat/offramp?label=%40usdctofiat%2Fofframp&color=8fb47d)](https://www.npmjs.com/package/@usdctofiat/offramp)
[![npm @peerlytics/sdk](https://img.shields.io/npm/v/@peerlytics/sdk?label=%40peerlytics%2Fsdk&color=8fb47d)](https://www.npmjs.com/package/@peerlytics/sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

TypeScript examples and agent skills for integrating USDC-to-fiat offramps and querying ZKP2P protocol data on Base.

## Quick start

```bash
git clone https://github.com/ADWilkinson/usdctofiat-peerlytics-starters.git
cd usdctofiat-peerlytics-starters
npm install
```

---

## USDCtoFiat — Offramp SDK

Create and manage USDC-to-fiat deposits on Base. Every deposit is delegated to the [Delegate vault](https://delegate.usdctofiat.xyz) for oracle-based rate management.

```bash
export PRIVATE_KEY=0x...   # wallet with USDC on Base
npx tsx usdctofiat/create-deposit.ts
```

| Script | What it does |
|--------|-------------|
| [`create-deposit.ts`](usdctofiat/create-deposit.ts) | Creates a delegated offramp deposit (approve → deposit → delegate) |
| [`manage-deposits.ts`](usdctofiat/manage-deposits.ts) | Lists deposits with status, balance, fills, delegation state |
| [`resume-deposit.ts`](usdctofiat/resume-deposit.ts) | Demonstrates resumable flow — detects undelegated deposits and delegates them |
| [`close-deposit.ts`](usdctofiat/close-deposit.ts) | Withdraws remaining USDC and closes a deposit |
| [`platform-explorer.ts`](usdctofiat/platform-explorer.ts) | Browse supported platforms, currencies, and validation rules |
| [`react-example.tsx`](usdctofiat/react-example.tsx) | Copy-paste React component with useOfframp hook |

### SDK

Package: [`@usdctofiat/offramp`](https://www.npmjs.com/package/@usdctofiat/offramp)

```ts
import { offramp, deposits, close, PLATFORMS, CURRENCIES } from "@usdctofiat/offramp";

// Create a deposit (resumable — call again to retry delegation)
const result = await offramp(walletClient, {
  amount: "100",
  platform: PLATFORMS.REVOLUT,
  currency: CURRENCIES.EUR,
  identifier: "alice",
});

// List deposits (read-only, no wallet needed)
const list = await deposits("0xYourAddress");

// Close a deposit
await close(walletClient, "361");

// Platform and currency data — no function calls, just constants
PLATFORMS.REVOLUT.currencies    // ["USD", "EUR", ...]
PLATFORMS.REVOLUT.validate("@alice")  // { valid: true, normalized: "alice" }
CURRENCIES.EUR.symbol           // "€"
```

| Export | What it does |
|--------|-------------|
| `offramp(walletClient, params, onProgress?)` | Create deposit + delegate. Resumable. Returns `{ depositId, txHash, resumed }` |
| `deposits(walletAddress)` | List deposits (read-only). Returns `DepositInfo[]` |
| `close(walletClient, depositId)` | Withdraw and close. Returns tx hash |
| `PLATFORMS` | Rich const: `.REVOLUT.currencies`, `.REVOLUT.identifier`, `.REVOLUT.validate()` |
| `CURRENCIES` | Rich const: `.EUR.symbol`, `.EUR.name`, `.EUR.countryCode` |

React hook: `import { useOfframp } from "@usdctofiat/offramp/react"`

### How deposits work

`offramp()` is **resumable**. If an undelegated deposit exists for the wallet, it skips straight to delegation instead of creating a new one. This handles browser crashes, failed delegation, and retry scenarios automatically.

The full flow orchestrates 5 steps, 3 of which are wallet transactions:

1. **Approve** USDC allowance (wallet tx)
2. **Register** payee details (API call, no signature)
3. **Create deposit** on-chain (wallet tx)
4. **Confirm** deposit ID from receipt/indexer (automatic)
5. **Delegate** to the Delegate vault (wallet tx)

Steps 1, 3, and 5 each require a wallet signature. Progress is reported via `onProgress`.

### Supported platforms

Revolut (23 currencies) · Wise (30+) · PayPal (7) · Venmo · Cash App · Zelle · Monzo · N26 · Chime · Mercado Pago

---

## Peerlytics — Analytics SDK

Query ZKP2P protocol data: rates, orderbooks, maker portfolios, and live activity.

```bash
export PEERLYTICS_API_KEY=pk_live_...   # get one at peerlytics.xyz/developers
npx tsx peerlytics/volume-dashboard.ts
```

| Script | What it does |
|--------|-------------|
| [`volume-dashboard.ts`](peerlytics/volume-dashboard.ts) | Protocol stats, liquidity, top 5 makers and takers |
| [`rate-monitor.ts`](peerlytics/rate-monitor.ts) | Polls rates for a currency, alerts when they cross a threshold |
| [`orderbook-snapshot.ts`](peerlytics/orderbook-snapshot.ts) | Orderbook depth across currencies with bar charts |
| [`maker-report.ts`](peerlytics/maker-report.ts) | Portfolio report for a maker address (deposits, profit, APR) |
| [`live-activity.ts`](peerlytics/live-activity.ts) | Real-time protocol events, color-coded by type |
| [`x402-agent.ts`](peerlytics/x402-agent.ts) | x402 pay-per-request flow (no key needed) |

### SDK

Package: [`@peerlytics/sdk`](https://www.npmjs.com/package/@peerlytics/sdk)

```ts
import { Peerlytics } from "@peerlytics/sdk";
const client = new Peerlytics({ apiKey: "pk_live_..." });
```

| Method | Returns |
|--------|---------|
| `getProtocolSummary()` | Protocol MTD/QTD/YTD/all-time volume, liquidity, deposits |
| `getProtocolOverview(range)` | Full analytics overview with timeseries for mtd, 3mtd, ytd, all |
| `getLeaderboard({ limit?, offset? })` | Top makers/takers by volume, APR, profit |
| `getMarketSummary({ currency?, platform?, includeRates?, limit?, offset? })` | Rate stats per platform/currency pair |
| `getOrderbook({ currency?, platform?, minSize? })` | Live orderbook grouped by rate level |
| `getDeposit(id, { limit?, offset? })` | Single deposit with intents and payment methods |
| `getDeposits({ depositor?, delegate?, platform?, currency?, status?, accepting?, limit?, offset? })` | Query deposits with filters |
| `getIntent(hash)` | Intent detail |
| `getIntents({ owner?, recipient?, verifier?, depositId?, status?, limit?, offset? })` | Query intents with filters |
| `getAddress(address, { limit?, offset? })` | Address profile with deposits, intents, stats |
| `getMaker(address)` | Maker portfolio with allocations and profit |
| `getVerifier(address, { limit?, offset? })` | Verifier stats and breakdown |
| `search(query, { type?, role?, limit?, offset? })` | Search by address, ENS, deposit ID |
| `getActivity({ type?, depositId?, address?, rateManagerId?, since?, limit?, offset? })` | Protocol events (signals, fills, rate updates) |
| `streamActivity(filters, { signal? })` | SSE real-time event stream (returns ReadableStream) |
| `getMakerHistory(address)` | Maker historical stats |
| `getTakerHistory(address)` | Taker historical stats |
| `getCurrencies()` | Supported fiat currencies |
| `getPlatforms()` | Supported payment platforms |
| `getVaultsOverview()` | All vaults with AUM, fees, snapshots |
| `getVault(id, { days? })` | Vault detail with snapshots |
| `listKeys()` | List API keys |
| `createKey(label?)` | Create key |
| `rotateKey(oldKey)` | Rotate key |
| `deleteKey(key)` | Delete key |
| `getCredits()` | Credit balance and packages |
| `createCheckout(pkg)` | Purchase credits (starter/growth/scale) |

### Auth

**API key** (recommended): 1,000 free requests/month. Get one at [peerlytics.xyz/developers](https://peerlytics.xyz/developers).

**x402** (keyless): Pay per request with USDC on Base. See `x402-agent.ts`.

---

## Config

```bash
cp .env.example .env
```

### USDCtoFiat

| Variable | Default | Script |
|----------|---------|--------|
| `PRIVATE_KEY` | _(required)_ | create-deposit, close-deposit |
| `WALLET_ADDRESS` | _(optional)_ | manage-deposits |
| `PLATFORM` | `revolut` | create-deposit |
| `CURRENCY` | `USD` | create-deposit |
| `IDENTIFIER` | `demo` | create-deposit |
| `AMOUNT` | `10` | create-deposit |

### Peerlytics

| Variable | Default | Script |
|----------|---------|--------|
| `PEERLYTICS_API_KEY` | _(required)_ | all except x402-agent |
| `CURRENCY` | `GBP` | rate-monitor |
| `CURRENCIES` | `GBP,EUR,BRL,TRY,NGN` | orderbook-snapshot |
| `THRESHOLD` | `1.02` | rate-monitor |
| `POLL_SECONDS` | `60` / `10` | rate-monitor, live-activity |

## For agents

- **llms.txt**: `https://peerlytics.xyz/llms.txt` — full API surface for LLM parsing
- **OpenAPI**: `https://peerlytics.xyz/api/openapi` — structured endpoint discovery
- **x402**: pay-per-request with USDC, no key management needed

## Links

**Products**

[usdctofiat.xyz](https://usdctofiat.xyz) · [delegate.usdctofiat.xyz](https://delegate.usdctofiat.xyz) · [peerlytics.xyz](https://peerlytics.xyz) · [orderbook.peerlytics.xyz](https://orderbook.peerlytics.xyz)

**SDKs**

[@usdctofiat/offramp](https://www.npmjs.com/package/@usdctofiat/offramp) · [@peerlytics/sdk](https://www.npmjs.com/package/@peerlytics/sdk)

**Social**

[@usdctofiat](https://x.com/usdctofiat) · [@davyjones0x](https://x.com/davyjones0x)

**Protocol**

[zkp2p.xyz](https://zkp2p.xyz) · [peer.xyz](https://peer.xyz)

## License

MIT
