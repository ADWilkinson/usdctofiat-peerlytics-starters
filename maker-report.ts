/**
 * maker-report.ts
 *
 * Generates a portfolio report for any maker address, showing
 * deposits, profit, estimated APR, and platform breakdown.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx maker-report.ts 0x1234...
 *
 * Environment:
 *   PEERLYTICS_API_KEY  - API key (optional, falls back to free tier)
 */

import { Peerlytics, PeerlyticsError, NotFoundError } from "@peerlytics/sdk";

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  usd: (n: number | string) => {
    const v = Number(n);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    if (v >= 1) return `$${v.toFixed(2)}`;
    return `$${v.toFixed(4)}`;
  },
  pct: (n: number) => `${(n * 100).toFixed(2)}%`,
  addr: (s: string) => (s.length <= 14 ? s : `${s.slice(0, 6)}...${s.slice(-4)}`),
  pad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length)),
  rpad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s),
};

const W = 62;

function box(title: string): void {
  console.log(`  ┌${"─".repeat(W)}┐`);
  console.log(`  │  ${fmt.bold(title)}${" ".repeat(Math.max(0, W - title.length - 2))}│`);
  console.log(`  ├${"─".repeat(W)}┤`);
}

function row(label: string, value: string): void {
  const content = `  ${fmt.dim(label)}${" ".repeat(Math.max(1, 22 - label.length))}${value}`;
  const visible = content.replace(/\x1b\[\d+m/g, "");
  const padding = Math.max(0, W - visible.length + 2);
  console.log(`  │${content}${" ".repeat(padding)}│`);
}

function bottom(): void {
  console.log(`  └${"─".repeat(W)}┘`);
}

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Report ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const address = process.argv[2];

  if (!address) {
    console.error("Usage: npx tsx maker-report.ts <address>");
    console.error("  e.g. npx tsx maker-report.ts 0xC141Cbe4f4a9CAbc3cc78159a9268a4e008922CD");
    process.exit(1);
  }

  console.log();
  console.log(`  ${fmt.bold("Maker Report")}  ${fmt.dim(fmt.addr(address))}`);
  console.log();

  // Fetch maker data and history in parallel
  const [maker, history] = await Promise.all([
    client.getMaker(address),
    client.getMakerHistory(address).catch(() => null),
  ]);

  // Overview
  box("Portfolio Overview");
  row("Address", fmt.cyan(fmt.addr(address)));
  row("Total Volume", fmt.green(fmt.usd(maker.totalVolume ?? 0)));
  row("Total Deposits", String(maker.depositCount ?? maker.totalDeposits ?? 0));
  row("Active Deposits", String(maker.activeDeposits ?? 0));
  row("Intents Filled", String(maker.totalIntents ?? maker.intentsFilled ?? 0));

  if (maker.totalProfit != null || maker.earnings != null) {
    const profit = Number(maker.totalProfit ?? maker.earnings ?? 0);
    row("Total Profit", profit >= 0 ? fmt.green(fmt.usd(profit)) : fmt.red(fmt.usd(profit)));
  }

  if (maker.apr != null || maker.estimatedApr != null) {
    const apr = Number(maker.apr ?? maker.estimatedApr ?? 0);
    row("Estimated APR", apr > 0 ? fmt.green(fmt.pct(apr)) : fmt.dim("--"));
  }

  bottom();
  console.log();

  // Deposits breakdown
  const deposits = maker.deposits ?? [];

  if (deposits.length > 0) {
    box("Active Deposits");
    console.log(
      `  │  ${fmt.dim(fmt.pad("ID", 8))}` +
        `${fmt.dim(fmt.pad("Platform", 12))}` +
        `${fmt.dim(fmt.pad("Currency", 10))}` +
        `${fmt.dim(fmt.pad("Rate", 10))}` +
        `${fmt.dim("Liquidity")}${" ".repeat(W - 53)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    const shown = deposits.slice(0, 10);
    for (const d of shown) {
      const id = String(d.depositId ?? d.id ?? "?").slice(0, 6);
      const platform = String(d.platform ?? d.paymentPlatform ?? "").slice(0, 10);
      const currency = String(d.currency ?? "").slice(0, 8);
      const rate = d.conversionRate ?? d.rate ?? 0;
      const liq = Number(d.availableLiquidity ?? d.amount ?? 0);

      const line =
        `  ${fmt.pad(id, 8)}` +
        `${fmt.pad(platform, 12)}` +
        `${fmt.pad(currency, 10)}` +
        `${fmt.pad(Number(rate).toFixed(4), 10)}` +
        `${fmt.usd(liq)}`;
      const visible = line.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${line}${" ".repeat(pad)}│`);
    }

    if (deposits.length > 10) {
      const more = `  ${fmt.dim(`... and ${deposits.length - 10} more`)}`;
      const visible = more.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${more}${" ".repeat(pad)}│`);
    }

    bottom();
    console.log();
  }

  // Platform breakdown from deposits
  if (deposits.length > 0) {
    const platforms = new Map<string, { count: number; liquidity: number; volume: number }>();

    for (const d of deposits) {
      const p = String(d.platform ?? d.paymentPlatform ?? "unknown");
      const liq = Number(d.availableLiquidity ?? d.amount ?? 0);
      const vol = Number(d.volume ?? 0);

      const existing = platforms.get(p);
      if (existing) {
        existing.count++;
        existing.liquidity += liq;
        existing.volume += vol;
      } else {
        platforms.set(p, { count: 1, liquidity: liq, volume: vol });
      }
    }

    box("Platform Breakdown");
    console.log(
      `  │  ${fmt.dim(fmt.pad("Platform", 14))}` +
        `${fmt.dim(fmt.pad("Deposits", 10))}` +
        `${fmt.dim(fmt.pad("Liquidity", 14))}` +
        `${fmt.dim("Volume")}${" ".repeat(W - 52)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    const sorted = Array.from(platforms.entries()).sort((a, b) => b[1].liquidity - a[1].liquidity);
    for (const [name, data] of sorted) {
      const line =
        `  ${fmt.pad(name, 14)}` +
        `${fmt.pad(String(data.count), 10)}` +
        `${fmt.pad(fmt.usd(data.liquidity), 14)}` +
        `${fmt.usd(data.volume)}`;
      const visible = line.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${line}${" ".repeat(pad)}│`);
    }

    bottom();
    console.log();
  }

  // Historical stats
  if (history) {
    const periods = history.periods ?? history.snapshots ?? [];
    if (periods.length > 0) {
      box("Historical Performance");
      console.log(
        `  │  ${fmt.dim(fmt.pad("Period", 14))}` +
          `${fmt.dim(fmt.pad("Volume", 14))}` +
          `${fmt.dim("Intents")}${" ".repeat(W - 41)}│`,
      );
      console.log(`  │  ${"─".repeat(W - 4)}  │`);

      const shown = periods.slice(0, 6);
      for (const p of shown) {
        const label = String(p.period ?? p.date ?? p.label ?? "");
        const vol = Number(p.volume ?? p.totalVolume ?? 0);
        const intents = Number(p.intents ?? p.intentCount ?? 0);

        const line = `  ${fmt.pad(label, 14)}${fmt.pad(fmt.usd(vol), 14)}${intents}`;
        const visible = line.replace(/\x1b\[\d+m/g, "");
        const pad = Math.max(0, W - visible.length + 2);
        console.log(`  │${line}${" ".repeat(pad)}│`);
      }

      bottom();
      console.log();
    }
  }

  console.log(`  ${fmt.dim(`Report generated ${new Date().toISOString()}`)}`);
  console.log();
}

main().catch((err) => {
  if (err instanceof NotFoundError) {
    console.error(`Address not found. Check it is a valid maker address.`);
  } else if (err instanceof PeerlyticsError) {
    console.error(`API error [${err.status}]: ${err.message}`);
  } else {
    console.error("Error:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
