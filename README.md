# peerlytics-starter

TypeScript examples for the [Peerlytics API](https://peerlytics.xyz/developers). Query ZKP2P P2P protocol data on Base: rates, orderbooks, maker portfolios, and live activity.

## Quick start

```bash
git clone https://github.com/ADWilkinson/peerlytics-starter.git
cd peerlytics-starter
npm install
npx tsx volume-dashboard.ts
```

## Examples

| Script | What it does |
|--------|-------------|
| [`volume-dashboard.ts`](volume-dashboard.ts) | Protocol stats, liquidity, top 5 makers and takers |
| [`rate-monitor.ts`](rate-monitor.ts) | Polls rates for a currency, alerts when they cross a threshold |
| [`orderbook-snapshot.ts`](orderbook-snapshot.ts) | Orderbook depth across currencies with bar charts |
| [`maker-report.ts`](maker-report.ts) | Portfolio report for a maker address (deposits, profit, APR) |
| [`live-activity.ts`](live-activity.ts) | Real-time protocol events, color-coded by type |
| [`x402-agent.ts`](x402-agent.ts) | Walks through the x402 pay-per-request flow (no key needed) |

Each script is self-contained. Run any with `npx tsx <file>.ts`.

## Auth

You don't need an API key to get started. The free tier gives you 1,000 requests/month.

For higher limits, grab a key at [peerlytics.xyz/developers](https://peerlytics.xyz/developers?tab=account) and export it:

```bash
export PEERLYTICS_API_KEY=pk_live_your_key_here
```

Or copy the template:

```bash
cp .env.example .env
```

There's also x402 (pay-per-request with USDC on Base) if you want to skip keys entirely. See `x402-agent.ts`.

## Config

| Variable | Default | Script |
|----------|---------|--------|
| `PEERLYTICS_API_KEY` | _(free tier)_ | all |
| `CURRENCY` | `GBP` | rate-monitor |
| `CURRENCIES` | `GBP,EUR,BRL,TRY,NGN` | orderbook-snapshot |
| `THRESHOLD` | `1.02` | rate-monitor |
| `POLL_SECONDS` | `60` / `10` | rate-monitor, live-activity |
| `EVENT_TYPE` | _(all)_ | live-activity |

## SDK

All examples use [`@peerlytics/sdk`](https://www.npmjs.com/package/@peerlytics/sdk):

```ts
import { Peerlytics } from "@peerlytics/sdk";
const p = new Peerlytics({ apiKey: "pk_live_..." });
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
| `getMakerHistory(address)` | Historical maker performance |
| `getCurrencies()` | Supported fiat currencies |
| `getPlatforms()` | Supported payment platforms |
| `getVaultsOverview()` | All vaults with AUM, fees, snapshots |

Full reference on [npm](https://www.npmjs.com/package/@peerlytics/sdk).

## For agents

If you're integrating with an LLM or building an autonomous agent:

- **llms.txt** at `https://peerlytics.xyz/llms.txt` has the full API surface in a format agents can parse
- **OpenAPI spec** at `https://peerlytics.xyz/api/openapi` for structured endpoint discovery
- **x402** lets agents pay per request with USDC on Base, no key management needed

## Links

- [peerlytics.xyz/developers](https://peerlytics.xyz/developers)
- [@peerlytics/sdk on npm](https://www.npmjs.com/package/@peerlytics/sdk)
- [OpenAPI spec](https://peerlytics.xyz/api/openapi?download=1)
- [llms.txt](https://peerlytics.xyz/llms.txt)
- [zkp2p.xyz](https://zkp2p.xyz)

## License

MIT
