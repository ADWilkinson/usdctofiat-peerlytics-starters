# USDCtoFiat & Peerlytics Starters

TypeScript examples for integrating USDC-to-fiat offramps and querying ZKP2P protocol data on Base.

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
| [`close-deposit.ts`](usdctofiat/close-deposit.ts) | Withdraws remaining USDC and closes a deposit |
| [`platform-explorer.ts`](usdctofiat/platform-explorer.ts) | Browse supported platforms, currencies, and validation rules |
| [`react-example.tsx`](usdctofiat/react-example.tsx) | Copy-paste React component with useOfframp hook |

### SDK

Package: [`@usdctofiat/offramp`](https://www.npmjs.com/package/@usdctofiat/offramp)

```ts
import { Offramp } from "@usdctofiat/offramp";

const offramp = new Offramp();
const result = await offramp.createDeposit(walletClient, {
  amount: "100",
  platform: "revolut",
  currency: "EUR",
  identifier: "alice",
});
```

| Method | Returns |
|--------|---------|
| `createDeposit(walletClient, params, onProgress?)` | `{ depositId, txHash }` |
| `getDeposits(walletAddress)` | `DepositInfo[]` with status, balance, fills |
| `withdrawDeposit(walletClient, depositId, escrowAddress?)` | Tx hash |
| `getPlatforms()` | Supported platforms with currencies |
| `getCurrencies(platform)` | Currency codes for a platform |
| `validateIdentifier(platform, identifier)` | `{ valid, normalized, error? }` |

React hook: `import { useOfframp } from "@usdctofiat/offramp/react"`

### How deposits work

`createDeposit` orchestrates 5 steps, 3 of which are wallet transactions:

1. **Approve** USDC allowance (wallet tx)
2. **Register** payee details (API call, no signature)
3. **Create deposit** on-chain (wallet tx)
4. **Confirm** deposit ID from receipt/indexer (automatic)
5. **Delegate** to the Delegate vault (wallet tx)

Steps 1, 3, and 5 each require a wallet signature. The SDK orchestrates the flow and reports progress via the `onProgress` callback.

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
| `getSummary()` | Protocol volume, liquidity, deposit count, spreads |
| `getLeaderboard({ limit? })` | Top makers/takers by volume, APR, profit |
| `getMarketSummary({ currency? })` | Rate stats per platform/currency pair |
| `getOrderbook({ currency? })` | Live orderbook grouped by rate level |
| `getDeposit(id)` | Single deposit with intents and payment methods |
| `getAddress(address)` | Address profile with deposits, intents, stats |
| `getMaker(address)` | Maker portfolio with allocations and profit |
| `search(query)` | Search by address, ENS, deposit ID |
| `getActivity({ type?, limit? })` | Protocol events (signals, fills, rate updates) |
| `getVaultsOverview()` | All vaults with AUM, fees, snapshots |

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

- [usdctofiat.xyz](https://usdctofiat.xyz) — USDC offramp app
- [delegate.usdctofiat.xyz](https://delegate.usdctofiat.xyz) — Delegate vault
- [peerlytics.xyz/developers](https://peerlytics.xyz/developers) — Peerlytics API
- [@usdctofiat/offramp on npm](https://www.npmjs.com/package/@usdctofiat/offramp)
- [@peerlytics/sdk on npm](https://www.npmjs.com/package/@peerlytics/sdk)
- [zkp2p.xyz](https://zkp2p.xyz) — Protocol

## License

MIT
