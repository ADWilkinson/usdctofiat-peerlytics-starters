/**
 * manage-deposits.ts
 *
 * Lists all deposits for a wallet address. No private key needed.
 *
 * Usage:
 *   npx tsx usdctofiat/manage-deposits.ts 0xYourAddress
 */

import { deposits } from "@usdctofiat/offramp";
import { isAddress } from "viem";

const address = process.argv[2] ?? process.env.WALLET_ADDRESS;
if (!address) {
  console.error("Usage: npx tsx usdctofiat/manage-deposits.ts <wallet-address>");
  process.exit(1);
}
if (!isAddress(address)) {
  console.error("Set <wallet-address> to a valid Ethereum address");
  process.exit(1);
}

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  usd: (n: number) => `$${n.toFixed(2)}`,
  status: (s: string) =>
    s === "active" ? fmt.green("● active")
    : s === "empty" ? fmt.yellow("○ empty")
    : fmt.dim("◌ closed"),
};

async function main() {
  console.log();
  console.log(fmt.bold("  Deposits"));
  console.log(fmt.dim(`  ${address}`));
  console.log();

  const list = await deposits(address);

  if (list.length === 0) {
    console.log(fmt.dim("  No deposits found."));
    console.log();
    return;
  }

  const active = list.filter((d) => d.status === "active");
  const totalRemaining = list.reduce((s, d) => s + d.remainingUsdc, 0);

  console.log(`  ${fmt.bold(String(list.length))} deposits  ·  ${fmt.bold(String(active.length))} active  ·  ${fmt.usd(totalRemaining)} remaining`);
  console.log();

  for (const d of list) {
    const balance = fmt.usd(d.remainingUsdc).padEnd(10);
    console.log(`  ${fmt.status(d.status)}  ${balance}  ${fmt.dim("#" + d.depositId)}  ${d.delegated ? fmt.cyan("delegate") : fmt.dim("self")}`);
    console.log(fmt.dim(`            ${d.paymentMethods.join(", ")}  ·  ${d.currencies.join(", ")}  ·  ${d.fulfilledIntents} fills`));
  }
  console.log();
}

main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
