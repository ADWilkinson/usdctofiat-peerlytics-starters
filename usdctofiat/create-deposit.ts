/**
 * create-deposit.ts
 *
 * Creates a USDC-to-fiat offramp deposit on Base. Automatically delegated
 * to the Delegate vault. Resumable — if an undelegated deposit exists,
 * skips straight to delegation.
 *
 * Usage:
 *   npx tsx usdctofiat/create-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) with USDC balance on Base
 *
 * Optional:
 *   AMOUNT         USDC amount (default: 1)
 */

import { offramp, PLATFORMS, CURRENCIES, type OfframpError } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}

const amount = process.env.AMOUNT ?? "1";

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

const STEP_LABELS: Record<string, string> = {
  resuming: "Resuming undelegated deposit",
  approving: "Approving USDC allowance",
  registering: "Registering payee details",
  depositing: "Creating deposit on-chain",
  confirming: "Waiting for confirmation",
  delegating: "Delegating to vault",
  restricting: "Restricting to OTC taker",
  done: "Complete",
};

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });

  console.log();
  console.log(fmt.bold("  USDCtoFiat Offramp"));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${PLATFORMS.REVOLUT.name}`);
  console.log(`  Currency:   ${CURRENCIES.USD.code} (${CURRENCIES.USD.symbol})`);
  console.log();

  try {
    const result = await offramp(walletClient, {
      amount,
      platform: PLATFORMS.REVOLUT,
      currency: CURRENCIES.USD,
      identifier: "demo",
    }, (progress) => {
      const label = STEP_LABELS[progress.step] ?? progress.step;
      const icon = progress.step === "done" ? fmt.green("✓") : fmt.yellow("⏳");
      console.log(`  ${icon} ${label}`);
    });

    console.log();
    console.log(fmt.green(`  ✓ Deposit ${result.resumed ? "resumed" : "created"} and delegated`));
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
    console.log();
  } catch (err) {
    const error = err as OfframpError;
    console.log();
    console.log(fmt.red(`  ✗ ${error.message}`));
    if (error.code) console.log(fmt.dim(`    Code: ${error.code}`));
    if (error.step) console.log(fmt.dim(`    Step: ${error.step}`));
    console.log();
    process.exit(1);
  }
}

main();
