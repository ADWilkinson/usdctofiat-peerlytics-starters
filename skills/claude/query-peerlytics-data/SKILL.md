---
name: query-peerlytics-data
description: Query ZKP2P protocol data using the @peerlytics/sdk — rates, orderbooks, deposits, maker portfolios, live activity, and vault analytics. Use when asked about P2P exchange rates, USDC liquidity, maker stats, or protocol analytics on Base.
---

# Query Peerlytics Data

## Overview

Guide the user to query ZKP2P protocol data using `@peerlytics/sdk`. The SDK provides real-time access to P2P exchange rates, orderbooks, maker portfolios, protocol activity, and vault analytics on Base.

## When to use

- User asks about USDC exchange rates or P2P liquidity
- User wants protocol analytics (volume, deposits, spreads)
- User asks about maker performance or deposit data
- User wants to build a dashboard or monitor with ZKP2P data
- User mentions Peerlytics, ZKP2P, or protocol analytics

## Installation

```bash
npm install @peerlytics/sdk
```

## Authentication

Two options:

**API key** (recommended): 1,000 free requests/month.
```typescript
import { Peerlytics } from "@peerlytics/sdk";
const client = new Peerlytics({ apiKey: "pk_live_..." });
// Get a key at https://peerlytics.xyz/developers
```

**x402** (keyless): Pay per request with USDC on Base. No account needed.

## Core patterns

### Protocol overview
```typescript
const summary = await client.getProtocolSummary();
// { mtd: { settledVolumeUsd, activeLiquidityUsd, activeDeposits, ... }, allTime: { ... } }
```

### Exchange rates
```typescript
const rates = await client.getMarketSummary({ currency: "EUR" });
// Rate stats per platform/currency pair: best rate, average, sample size
```

### Live orderbook
```typescript
const orderbook = await client.getOrderbook({ currency: "GBP" });
// Orderbook grouped by rate level: rate, totalLiquidity, depositCount
```

### Maker portfolio
```typescript
const maker = await client.getMaker("0xMakerAddress");
// Deposits, profit, APR, allocation breakdown, active currencies
```

### Deposit detail
```typescript
const deposit = await client.getDeposit("42");
// Full deposit with intents, payment methods, currencies, status
```

### Live activity
```typescript
const events = await client.getActivity({ type: "fill", limit: 20 });
// Protocol events: signals, fills, rate updates, deposits
```

### Vault analytics
```typescript
const vaults = await client.getVaultsOverview();
// All vaults with AUM, fees, fill count, daily snapshots
```

## Full method reference

Analytics:
- `getProtocolSummary()` — protocol MTD/QTD/YTD/all-time volume, liquidity, deposits
- `getLeaderboard({ limit?, offset? })` — top makers/takers by volume, APR, profit
- `getProtocolOverview(range)` — full analytics overview for mtd, 3mtd, ytd, all

Market:
- `getMarketSummary({ currency?, platform?, includeRates?, limit?, offset? })` — rate stats per pair
- `getOrderbook({ currency?, platform?, minSize? })` — live orderbook by rate level

Explorer:
- `getDeposit(id, { limit?, offset? })` — deposit detail with intents
- `getDeposits({ depositor?, delegate?, platform?, currency?, status?, accepting?, limit?, offset? })` — query deposits
- `getIntent(hash)` — intent detail
- `getIntents({ owner?, recipient?, verifier?, depositId?, status?, limit?, offset? })` — query intents
- `getAddress(address, { limit?, offset? })` — address profile with stats
- `getMaker(address)` — maker portfolio with allocations and profit
- `getVerifier(address, { limit?, offset? })` — verifier stats and breakdown
- `getVault(id, { days? })` — vault detail with snapshots
- `search(query, { type?, role?, limit?, offset? })` — multi-type search

Activity:
- `getActivity({ type?, depositId?, address?, rateManagerId?, since?, limit?, offset? })` — live protocol events
- `streamActivity({ type?, rateManagerId?, since?, intervalMs?, limit? }, { signal? })` — SSE real-time event stream (returns ReadableStream<LiveEvent>)

History:
- `getMakerHistory(address)` — maker historical stats
- `getTakerHistory(address)` — taker historical stats

Metadata:
- `getCurrencies()` — supported fiat currencies
- `getPlatforms()` — supported payment platforms

Vaults:
- `getVaultsOverview()` — all vaults with AUM, fees, snapshots
- `getVault(id, { days? })` — vault detail with snapshots

Account:
- `listKeys()` — list API keys
- `createKey(label?)` — create key
- `rotateKey(oldKey)` — rotate key
- `deleteKey(key)` — delete key
- `getCredits()` — credit balance and packages
- `createCheckout(pkg)` — purchase credits (starter/growth/scale)

## Error handling

```typescript
import { PeerlyticsError, RateLimitError, NotFoundError, ValidationError } from "@peerlytics/sdk";

try {
  const data = await client.getMaker(address);
} catch (err) {
  if (err instanceof NotFoundError) console.log("Address not found");
  if (err instanceof RateLimitError) console.log("Rate limited, retry later");
  if (err instanceof PeerlyticsError) console.log(err.message);
}
```

## Links

- API docs: https://peerlytics.xyz/developers
- npm: https://www.npmjs.com/package/@peerlytics/sdk
- OpenAPI spec: https://peerlytics.xyz/api/openapi
- llms.txt: https://peerlytics.xyz/llms.txt
- Starters: https://github.com/ADWilkinson/usdctofiat-peerlytics-starters
