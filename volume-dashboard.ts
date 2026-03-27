/**
 * volume-dashboard.ts
 *
 * Fetches protocol summary and leaderboard data, then renders a
 * formatted terminal dashboard with volume, liquidity, and the
 * top 5 makers and takers.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx volume-dashboard.ts
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  usd: (n: number | string) => {
    const v = Number(n);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  },
  addr: (s: string) => (s.length <= 12 ? s : `${s.slice(0, 6)}...${s.slice(-4)}`),
  pad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length)),
  rpad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s),
};

const W = 62;

function box(title: string): void {
  console.log(`  ┌${"─".repeat(W)}┐`);
  console.log(`  │  ${fmt.bold(title)}${" ".repeat(W - title.length - 2)}│`);
  console.log(`  ├${"─".repeat(W)}┤`);
}

function row(label: string, value: string): void {
  const content = `  ${fmt.dim(label)}${" ".repeat(Math.max(1, 22 - label.length))}${value}`;
  // Strip ANSI for length calculation
  const visible = content.replace(/\x1b\[\d+m/g, "");
  const padding = Math.max(0, W - visible.length + 2);
  console.log(`  │${content}${" ".repeat(padding)}│`);
}

function divider(): void {
  console.log(`  ├${"─".repeat(W)}┤`);
}

function bottom(): void {
  console.log(`  └${"─".repeat(W)}┘`);
}

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Dashboard ───────────────────────────────────────────────────

async function main(): Promise<void> {
  const [summary, leaderboard] = await Promise.all([
    client.getSummary(),
    client.getLeaderboard({ limit: 5 }),
  ]);

  console.log();

  // Protocol summary
  box("Protocol Summary");
  row("Total Volume", fmt.green(fmt.usd(summary.totalVolume ?? 0)));
  row("Active Liquidity", fmt.usd(summary.activeLiquidity ?? 0));
  row("Active Deposits", String(summary.activeDeposits ?? 0));
  row("Unique Makers", String(summary.uniqueMakers ?? 0));
  row("Unique Takers", String(summary.uniqueTakers ?? 0));
  bottom();

  console.log();

  // Top makers
  if (leaderboard.makers?.length) {
    box("Top Makers");
    console.log(
      `  │  ${fmt.dim(fmt.pad("#", 4))}${fmt.dim(fmt.pad("Address", 16))}` +
        `${fmt.dim(fmt.pad("Volume", 14))}${fmt.dim("Deposits")}${" ".repeat(W - 48)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    for (let i = 0; i < leaderboard.makers.length; i++) {
      const m = leaderboard.makers[i];
      const line =
        `  ${fmt.pad(String(i + 1), 4)}` +
        `${fmt.pad(fmt.addr(m.address), 16)}` +
        `${fmt.pad(fmt.usd(m.totalVolume ?? 0), 14)}` +
        `${m.depositCount ?? 0}`;
      const visible = line.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${line}${" ".repeat(pad)}│`);
    }
    bottom();
    console.log();
  }

  // Top takers
  if (leaderboard.takers?.length) {
    box("Top Takers");
    console.log(
      `  │  ${fmt.dim(fmt.pad("#", 4))}${fmt.dim(fmt.pad("Address", 16))}` +
        `${fmt.dim(fmt.pad("Volume", 14))}${fmt.dim("Intents")}${" ".repeat(W - 47)}│`,
    );
    console.log(`  │  ${"─".repeat(W - 4)}  │`);

    for (let i = 0; i < leaderboard.takers.length; i++) {
      const t = leaderboard.takers[i];
      const line =
        `  ${fmt.pad(String(i + 1), 4)}` +
        `${fmt.pad(fmt.addr(t.address), 16)}` +
        `${fmt.pad(fmt.usd(t.totalVolume ?? 0), 14)}` +
        `${t.intentCount ?? 0}`;
      const visible = line.replace(/\x1b\[\d+m/g, "");
      const pad = Math.max(0, W - visible.length + 2);
      console.log(`  │${line}${" ".repeat(pad)}│`);
    }
    bottom();
    console.log();
  }

  console.log(`  ${fmt.dim(`Generated ${new Date().toISOString()}`)}`);
  console.log();
}

main().catch((err) => {
  if (err instanceof PeerlyticsError) {
    console.error(`Error [${err.status}]: ${err.message}`);
  } else {
    console.error("Error:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
