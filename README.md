# peerlytics-starter

Runnable TypeScript examples for the [Peerlytics API](https://peerlytics.xyz/developers) -- protocol analytics, orderbook data, and maker tools for the ZKP2P P2P network.

## Quick start

```bash
git clone https://github.com/peerlytics/peerlytics-starter.git && cd peerlytics-starter
npm install
npx tsx volume-dashboard.ts
```

## Examples

| Script | Description |
|--------|-------------|
| [`rate-monitor.ts`](rate-monitor.ts) | Poll market rates for a currency and alert when the best rate crosses a threshold |
| [`volume-dashboard.ts`](volume-dashboard.ts) | Terminal dashboard with protocol volume, liquidity, and top makers/takers |
| [`orderbook-snapshot.ts`](orderbook-snapshot.ts) | Fetch live orderbook depth across currencies with rate-level grouping |
| [`maker-report.ts`](maker-report.ts) | Portfolio report for any maker address -- deposits, profit, APR, platform breakdown |
| [`live-activity.ts`](live-activity.ts) | Stream real-time protocol events (signals, fills, rate updates) with color-coded output |
| [`x402-agent.ts`](x402-agent.ts) | Demonstrate the x402 pay-per-request flow without an API key (USDC on Base) |

Every script is self-contained. Run any of them with `npx tsx <script>.ts`.

## Authentication

Two options:

1. **API Key** -- set `PEERLYTICS_API_KEY` env var (get one at [peerlytics.xyz/developers](https://peerlytics.xyz/developers?tab=account))
2. **x402** -- pay per request with USDC on Base, no key needed ([docs](https://peerlytics.xyz/developers#docs-auth))

## Links

- [API documentation](https://peerlytics.xyz/developers)
- [Interactive API reference (OpenAPI)](https://peerlytics.xyz/docs)
- [SDK on npm](https://www.npmjs.com/package/@peerlytics/sdk)
- [OpenAPI spec download](https://peerlytics.xyz/api/openapi?download=1)
- [peerlytics-starter on GitHub](https://github.com/peerlytics/peerlytics-starter)
