/**
 * maker-report.ts
 *
 * Generates a portfolio report for any maker address, showing
 * deposits, profit, estimated APR, and platform breakdown.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx peerlytics/maker-report.ts 0x1234...
 *
 * Environment:
 *   PEERLYTICS_API_KEY  - API key (get one at peerlytics.xyz/developers)
 */

import { Peerlytics, PeerlyticsError, NotFoundError } from "@peerlytics/sdk";
import { isAddress } from "viem";

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
  const address = process.argv[2]?.trim();

  if (!address) {
    console.error("Usage: npx tsx peerlytics/maker-report.ts <address>");
    console.error("  e.g. npx tsx peerlytics/maker-report.ts 0xC141Cbe4f4a9CAbc3cc78159a9268a4e008922CD");
    process.exit(1);
  }
  if (!isAddress(address)) {
    console.error("Set <address> to a valid Ethereum address");
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

  const { summary } = maker;

  // Overview
  box("Portfolio Overview");
  row("Address", fmt.cyan(fmt.addr(address)));
  row("Total Volume", fmt.green(fmt.usd(summary.totalFillVolumeUsd)));
  row("Total Deposits", String(summary.totalDeposits));
  row("Active Deposits", String(summary.activeDeposits));
  row("Intents Filled", String(summary.fulfilledIntents));

  const profit = summary.totalProfitUsd;
  row("Total Profit", profit >= 0 ? fmt.green(fmt.usd(profit)) : fmt.red(fmt.usd(profit)));

  const apr = summary.weightedAvgApr;
  row("Estimated APR", apr != null && apr > 0 ? fmt.green(fmt.pct(apr)) : fmt.dim("--"));

  bottom();
  console.log();

  // Deposits breakdown
  const deposits = maker.deposits;

  if (deposits.length > 0) {
    box("Active Deposits");
    console.log(
      `  │  ${fmt.dim(fmt.pad("ID", 8))}` +
        `${fmt.dim(fmt.pad("Platform", 12))}` +
        `${fmt.dim(fmt.pad("Currency", 10))}` +
        `${fmt.dim(fmt.pad("Status", 10))}` +
        `${fmt.dim("Liquidity")}${" ".repeat(W - 53)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    const shown = deposits.slice(0, 10);
    for (const d of shown) {
      const id = d.depositId.slice(0, 6);
      const platform = (d.platforms[0] ?? "").slice(0, 10);
      const currency = (d.currencies[0] ?? "").slice(0, 8);
      const status = d.status.slice(0, 8);
      const liq = d.availableUsd;

      const line =
        `  ${fmt.pad(id, 8)}` +
        `${fmt.pad(platform, 12)}` +
        `${fmt.pad(currency, 10)}` +
        `${fmt.pad(status, 10)}` +
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

  // Platform breakdown from platformAllocations
  const platformAllocations = maker.platformAllocations;

  if (platformAllocations.length > 0) {
    box("Platform Breakdown");
    console.log(
      `  │  ${fmt.dim(fmt.pad("Platform", 14))}` +
        `${fmt.dim(fmt.pad("Fills", 10))}` +
        `${fmt.dim(fmt.pad("Volume", 14))}` +
        `${fmt.dim("Profit")}${" ".repeat(W - 50)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    const sorted = [...platformAllocations].sort((a, b) => b.volumeUsd - a.volumeUsd);
    for (const p of sorted) {
      const line =
        `  ${fmt.pad(p.platform, 14)}` +
        `${fmt.pad(String(p.fulfilledIntents), 10)}` +
        `${fmt.pad(fmt.usd(p.volumeUsd), 14)}` +
        `${fmt.usd(p.profitUsd)}`;
      const visible = line.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${line}${" ".repeat(pad)}│`);
    }

    bottom();
    console.log();
  }

  // Historical stats
  if (history) {
    const recentIntents = history.intents.recent;
    if (recentIntents.length > 0) {
      box("Recent Activity");
      console.log(
        `  │  ${fmt.dim(fmt.pad("Currency", 10))}` +
          `${fmt.dim(fmt.pad("Amount", 14))}` +
          `${fmt.dim(fmt.pad("Status", 12))}` +
          `${fmt.dim("Platform")}${" ".repeat(W - 52)}│`,
      );
      console.log(`  │  ${"─".repeat(W - 4)}  │`);

      const shown = recentIntents.slice(0, 6);
      for (const intent of shown) {
        const line =
          `  ${fmt.pad(intent.currency, 10)}` +
          `${fmt.pad(fmt.usd(intent.amountUsd), 14)}` +
          `${fmt.pad(intent.status, 12)}` +
          `${intent.verifier.slice(0, 10)}`;
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
