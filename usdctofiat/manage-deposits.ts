/**
 * manage-deposits.ts
 *
 * Lists all deposits for a wallet address with status, balance, fills, and
 * delegation state. No private key needed -- read-only.
 *
 * Usage:
 *   npx tsx usdctofiat/manage-deposits.ts 0xYourAddress
 *   npx tsx usdctofiat/manage-deposits.ts              # uses WALLET_ADDRESS env
 *
 * Optional:
 *   WALLET_ADDRESS   Fallback if no CLI argument provided
 */

import { Offramp, type DepositInfo } from "@usdctofiat/offramp";

// ── Config ──────────────────────────────────────────────────────────

const address = process.argv[2] ?? process.env.WALLET_ADDRESS;
if (!address) {
  console.error("Usage: npx tsx usdctofiat/manage-deposits.ts <wallet-address>");
  process.exit(1);
}

// ── Formatting ──────────────────────────────────────────────────────

const W = 62;

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  usd: (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
    : `$${n.toFixed(2)}`,
  addr: (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`,
  status: (s: string) =>
    s === "active" ? fmt.green("● active")
    : s === "empty" ? fmt.yellow("○ empty")
    : fmt.dim("◌ closed"),
  pad: (s: string, w: number) => {
    const vis = s.replace(/\x1b\[\d+m/g, "").length;
    return s + " ".repeat(Math.max(0, w - vis));
  },
};

function line(char = "─") {
  console.log(`  ${char.repeat(W)}`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const offramp = new Offramp();

  console.log();
  console.log(fmt.bold("  Deposits"));
  console.log(fmt.dim(`  ${address}`));
  console.log();

  const deposits = await offramp.getDeposits(address);

  if (deposits.length === 0) {
    console.log(fmt.dim("  No deposits found for this address."));
    console.log();
    return;
  }

  const active = deposits.filter((d) => d.status === "active");
  const totalRemaining = deposits.reduce((s, d) => s + d.remainingUsdc, 0);
  const totalFills = deposits.reduce((s, d) => s + d.fulfilledIntents, 0);

  console.log(`  ${fmt.bold(String(deposits.length))} deposits  ·  ${fmt.bold(String(active.length))} active  ·  ${fmt.usd(totalRemaining)} remaining  ·  ${totalFills} fills`);
  console.log();
  line();

  for (const d of deposits) {
    const status = fmt.status(d.status);
    const balance = fmt.pad(fmt.usd(d.remainingUsdc), 10);
    const id = fmt.dim(`#${d.depositId}`);
    const delegation = d.delegated ? fmt.cyan("delegate") : fmt.dim("self");

    console.log(`  ${status}  ${balance}  ${id}  ${delegation}`);

    const details = [
      d.paymentMethods.join(", "),
      d.currencies.join(", "),
      `${d.fulfilledIntents} fills`,
      d.outstandingUsdc > 0 ? fmt.yellow(`${fmt.usd(d.outstandingUsdc)} pending`) : null,
    ].filter(Boolean).join("  ·  ");

    console.log(fmt.dim(`  ${" ".repeat(10)}${details}`));
  }

  line();
  console.log(fmt.dim(`  ${new Date().toISOString()}`));
  console.log();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
