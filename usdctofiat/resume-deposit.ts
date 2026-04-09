/**
 * resume-deposit.ts
 *
 * Demonstrates the resumable offramp flow. Calls offramp() which automatically
 * detects any existing undelegated deposit and delegates it instead of creating
 * a new one. Handles browser crashes, failed delegation, and retry scenarios.
 *
 * Usage:
 *   npx tsx usdctofiat/resume-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) with USDC balance on Base
 *
 * How it works:
 *   1. First run: creates a new deposit and delegates it
 *   2. If delegation fails or is interrupted: run again
 *   3. Second run detects the undelegated deposit and delegates it (no new deposit)
 */

import { offramp, deposits, PLATFORMS, CURRENCIES, type OfframpError } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

  console.log();
  console.log(fmt.bold("  Resumable Offramp Demo"));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();

  // Show current deposit state before calling offramp
  const before = await deposits(account.address);
  const undelegated = before.filter((d) => d.status === "active" && !d.delegated);

  if (undelegated.length > 0) {
    console.log(fmt.yellow(`  Found ${undelegated.length} undelegated deposit(s):`));
    for (const d of undelegated) {
      console.log(fmt.dim(`    #${d.depositId}  ${d.remainingUsdc} USDC  ${d.paymentMethods.join(", ")}`));
    }
    console.log(fmt.dim("  offramp() will resume delegation instead of creating a new deposit"));
  } else {
    console.log(fmt.dim("  No undelegated deposits found — will create a new one"));
  }
  console.log();

  try {
    const result = await offramp(walletClient, {
      amount: "1",
      platform: PLATFORMS.REVOLUT,
      currency: CURRENCIES.USD,
      identifier: "demo",
    }, (progress) => {
      const icons: Record<string, string> = {
        resuming: fmt.cyan("↻"),
        approving: fmt.yellow("⏳"),
        registering: fmt.yellow("⏳"),
        depositing: fmt.yellow("⏳"),
        confirming: fmt.yellow("⏳"),
        delegating: fmt.yellow("⏳"),
        restricting: fmt.yellow("⏳"),
        done: fmt.green("✓"),
      };
      console.log(`  ${icons[progress.step] ?? "·"} ${progress.step}${progress.depositId ? ` #${progress.depositId}` : ""}`);
    });

    console.log();
    if (result.resumed) {
      console.log(fmt.green("  ✓ Existing deposit resumed and delegated"));
    } else {
      console.log(fmt.green("  ✓ New deposit created and delegated"));
    }
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
    console.log(`  Resumed:    ${result.resumed ? fmt.cyan("yes") : "no"}`);
    console.log();
  } catch (err) {
    const error = err as OfframpError;
    console.log();
    console.log(fmt.red(`  ✗ ${error.message}`));
    if (error.code) console.log(fmt.dim(`    Code: ${error.code}`));
    if (error.depositId) console.log(fmt.dim(`    Deposit: #${error.depositId}`));
    console.log();
    console.log(fmt.dim("  Run this script again to retry — offramp() will pick up where it left off."));
    console.log();
    process.exit(1);
  }
}

main();
