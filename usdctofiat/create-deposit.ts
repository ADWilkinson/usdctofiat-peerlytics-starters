/**
 * create-deposit.ts
 *
 * Creates a USDC-to-fiat offramp deposit on Base. The deposit is automatically
 * delegated to the Delegate vault for oracle-based rate management.
 *
 * Usage:
 *   npx tsx usdctofiat/create-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) with USDC balance on Base
 *
 * Optional:
 *   PLATFORM       Payment platform (default: revolut)
 *   CURRENCY       Fiat currency code (default: USD)
 *   IDENTIFIER     Platform username/email (default: demo)
 *   AMOUNT         USDC amount to deposit (default: 10)
 */

import { Offramp, type OfframpError } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Config ──────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}

const platform = (process.env.PLATFORM ?? "revolut") as "revolut";
const currency = process.env.CURRENCY ?? "USD";
const identifier = process.env.IDENTIFIER ?? "demo";
const amount = process.env.AMOUNT ?? "10";

// ── Formatting ──────────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

const STEP_LABELS: Record<string, string> = {
  approving: "Approving USDC allowance",
  registering: "Registering payee details",
  depositing: "Creating deposit on-chain",
  confirming: "Waiting for confirmation",
  delegating: "Delegating to vault",
  done: "Complete",
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

  console.log();
  console.log(fmt.bold("  USDCtoFiat Offramp"));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${platform}`);
  console.log(`  Currency:   ${currency}`);
  console.log(`  Identifier: ${identifier}`);
  console.log();

  try {
    const result = await offramp.createDeposit(
      walletClient,
      { amount, platform, currency, identifier },
      (progress) => {
        const label = STEP_LABELS[progress.step] ?? progress.step;
        const icon = progress.step === "done" ? fmt.green("✓") : fmt.yellow("⏳");
        console.log(`  ${icon} ${label}`);
        if (progress.txHash) {
          console.log(fmt.dim(`    tx: ${progress.txHash}`));
        }
      },
    );

    console.log();
    console.log(fmt.green("  ✓ Deposit created and delegated"));
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
    console.log(fmt.dim(`  View:       https://usdctofiat.xyz`));
    console.log();
  } catch (err) {
    const error = err as OfframpError;
    console.log();
    console.log(fmt.red(`  ✗ ${error.message}`));
    if (error.code) console.log(fmt.dim(`    Code: ${error.code}`));
    if (error.step) console.log(fmt.dim(`    Step: ${error.step}`));
    if (error.txHash) console.log(fmt.dim(`    Tx:   ${error.txHash}`));
    console.log();
    process.exit(1);
  }
}

main();
