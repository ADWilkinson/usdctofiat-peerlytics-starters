/**
 * close-deposit.ts
 *
 * Withdraws remaining USDC from a deposit and closes it.
 *
 * Usage:
 *   npx tsx usdctofiat/close-deposit.ts <deposit-id>
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) that owns the deposit
 *
 * Optional:
 *   ESCROW         Escrow contract address (defaults to current V3 escrow)
 */

import { Offramp, type OfframpError } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Config ──────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const depositId = process.argv[2];

if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}

if (!depositId) {
  console.error("Usage: npx tsx usdctofiat/close-deposit.ts <deposit-id>");
  process.exit(1);
}

// ── Formatting ──────────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const offramp = new Offramp();
  const escrow = process.env.ESCROW as `0x${string}` | undefined;

  console.log();
  console.log(fmt.bold(`  Closing deposit #${depositId}`));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();

  try {
    const txHash = await offramp.withdrawDeposit(walletClient, depositId, escrow);
    console.log(fmt.green("  ✓ Deposit closed"));
    console.log(fmt.dim(`  Tx: ${txHash}`));
    console.log();
  } catch (err) {
    const error = err as OfframpError;
    console.log(fmt.red(`  ✗ ${error.message ?? err}`));
    console.log();
    process.exit(1);
  }
}

main();
