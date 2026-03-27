/**
 * orderbook-snapshot.ts
 *
 * Fetches the live P2P orderbook across multiple currencies and
 * displays depth by rate level with total liquidity per market.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx orderbook-snapshot.ts
 *
 * Environment:
 *   PEERLYTICS_API_KEY  - API key (optional, falls back to free tier)
 *   CURRENCIES          - Comma-separated list (default: GBP,EUR,BRL,TRY,NGN)
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

// ── Config ──────────────────────────────────────────────────────

const CURRENCIES = (process.env.CURRENCIES ?? "GBP,EUR,BRL,TRY,NGN").split(",").map((c) => c.trim());

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  usd: (n: number | string) => {
    const v = Number(n);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  },
  rate: (n: number) => n.toFixed(4),
  pad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length)),
  rpad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s),
  bar: (ratio: number, width: number) => {
    const filled = Math.round(ratio * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  },
};

const W = 62;

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Render ───────────────────────────────────────────────────────

interface RateLevel {
  rate: number;
  liquidity: number;
  deposits: number;
}

function renderMarket(currency: string, levels: RateLevel[], totalLiquidity: number): void {
  console.log(`  ┌${"─".repeat(W)}┐`);
  console.log(
    `  │  ${fmt.bold(currency)} Orderbook` +
      `${" ".repeat(W - currency.length - 14)}` +
      `${fmt.dim("Total")} ${fmt.green(fmt.usd(totalLiquidity))}  │`,
  );
  console.log(`  ├${"─".repeat(W)}┤`);

  if (levels.length === 0) {
    console.log(`  │  ${fmt.dim("No active orders")}${" ".repeat(W - 20)}│`);
    console.log(`  └${"─".repeat(W)}┘`);
    return;
  }

  // Header
  console.log(
    `  │  ${fmt.dim(fmt.pad("Rate", 10))}` +
      `${fmt.dim(fmt.pad("Liquidity", 14))}` +
      `${fmt.dim(fmt.pad("Deps", 6))}` +
      `${fmt.dim("Depth")}${" ".repeat(W - 51)}│`,
  );
  console.log(`  │  ${"─".repeat(W - 4)}  │`);

  const maxLiq = Math.max(...levels.map((l) => l.liquidity));

  for (const level of levels) {
    const ratio = maxLiq > 0 ? level.liquidity / maxLiq : 0;
    const line =
      `  ${fmt.pad(fmt.rate(level.rate), 10)}` +
      `${fmt.pad(fmt.usd(level.liquidity), 14)}` +
      `${fmt.pad(String(level.deposits), 6)}` +
      `${fmt.green(fmt.bar(ratio, 20))}`;
    const visible = line.replace(/\x1b\[\d+m/g, "");
    const pad = Math.max(0, W - visible.length + 2);
    console.log(`  │${line}${" ".repeat(pad)}│`);
  }

  console.log(`  └${"─".repeat(W)}┘`);
}

// ── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log();
  console.log(`  ${fmt.bold("Orderbook Snapshot")}  ${fmt.dim(CURRENCIES.join(", "))}`);
  console.log();

  for (const currency of CURRENCIES) {
    try {
      const orderbook = await client.getOrderbook({ currency });
      const entries = orderbook.orders ?? orderbook.deposits ?? [];

      // Group by rate level (rounded to 4 decimals)
      const grouped = new Map<string, { liquidity: number; deposits: number }>();
      let totalLiquidity = 0;

      for (const entry of entries) {
        const rate = entry.conversionRate ?? entry.rate ?? 0;
        const liq = Number(entry.availableLiquidity ?? entry.amount ?? 0);
        const key = rate.toFixed(4);

        totalLiquidity += liq;

        const existing = grouped.get(key);
        if (existing) {
          existing.liquidity += liq;
          existing.deposits += 1;
        } else {
          grouped.set(key, { liquidity: liq, deposits: 1 });
        }
      }

      // Sort by rate ascending
      const levels: RateLevel[] = Array.from(grouped.entries())
        .map(([key, val]) => ({ rate: Number(key), ...val }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 12); // Cap at 12 levels for readability

      renderMarket(currency, levels, totalLiquidity);
      console.log();
    } catch (err) {
      if (err instanceof PeerlyticsError) {
        console.log(`  ${fmt.dim(currency)}: ${err.message}`);
      } else {
        console.log(`  ${fmt.dim(currency)}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
      console.log();
    }
  }

  console.log(`  ${fmt.dim(`Snapshot taken ${new Date().toISOString()}`)}`);
  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
