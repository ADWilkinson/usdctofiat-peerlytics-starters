/**
 * otc-deposit.ts
 *
 * Creates a USDC-to-fiat deposit restricted to a single taker wallet (OTC
 * private order). Demonstrates both the one-call path via `otcTaker` and the
 * retrofit path via `enableOtc` / `disableOtc` / `getOtcLink`.
 *
 * Usage:
 *   npx tsx usdctofiat/otc-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) with USDC balance on Base
 *   OTC_TAKER      Taker wallet address (0x...) allowed to fill the deposit
 *
 * Optional:
 *   AMOUNT         USDC amount (default: 1)
 *   MODE           "one-call" (default) or "retrofit"
 */

import {
  offramp,
  enableOtc,
  disableOtc,
  getOtcLink,
  PLATFORMS,
  CURRENCIES,
  type OfframpError,
} from "@usdctofiat/offramp";
import { createWalletClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const OTC_TAKER = process.env.OTC_TAKER;
const amount = process.env.AMOUNT ?? "1";
const mode = (process.env.MODE ?? "one-call") as "one-call" | "retrofit";

if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}
if (!OTC_TAKER || !isAddress(OTC_TAKER)) {
  console.error("Set OTC_TAKER env var to the taker's Ethereum address");
  process.exit(1);
}
const taker: string = OTC_TAKER;

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
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  console.log();
  console.log(fmt.bold("  USDCtoFiat OTC Deposit"));
  console.log(fmt.dim(`  Owner:  ${account.address}`));
  console.log(fmt.dim(`  Taker:  ${taker}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${PLATFORMS.REVOLUT.name}`);
  console.log(`  Currency:   ${CURRENCIES.USD.code} (${CURRENCIES.USD.symbol})`);
  console.log(`  Mode:       ${fmt.cyan(mode)}`);
  console.log();

  try {
    if (mode === "one-call") {
      // One-call OTC: pass otcTaker to offramp() and the SDK handles restriction
      // as a final step after delegation.
      const result = await offramp(
        walletClient,
        {
          amount,
          platform: PLATFORMS.REVOLUT,
          currency: CURRENCIES.USD,
          identifier: "demo",
          otcTaker: taker,
        },
        (progress) => {
          const label = STEP_LABELS[progress.step] ?? progress.step;
          const icon = progress.step === "done" ? fmt.green("✓") : fmt.yellow("⏳");
          console.log(`  ${icon} ${label}`);
        },
      );

      console.log();
      console.log(fmt.green("  ✓ OTC deposit created, delegated, and restricted"));
      console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
      console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
      if (result.otcLink) {
        console.log(`  OTC link:   ${fmt.cyan(result.otcLink)}`);
        console.log(fmt.dim("  Share this link with the taker — only OTC_TAKER can fill it."));
      }
      console.log();
      return;
    }

    // Retrofit: create a public deposit first, then restrict it with enableOtc.
    // Useful when you want the taker wallet to be decided after deposit creation.
    const result = await offramp(
      walletClient,
      {
        amount,
        platform: PLATFORMS.REVOLUT,
        currency: CURRENCIES.USD,
        identifier: "demo",
      },
      (progress) => {
        const label = STEP_LABELS[progress.step] ?? progress.step;
        const icon = progress.step === "done" ? fmt.green("✓") : fmt.yellow("⏳");
        console.log(`  ${icon} ${label}`);
      },
    );

    console.log();
    console.log(fmt.green(`  ✓ Deposit ${result.resumed ? "resumed" : "created"} and delegated`));
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log();

    console.log(fmt.yellow("  ⏳ Applying OTC restriction..."));
    const otcResult = await enableOtc(walletClient, result.depositId, taker);
    console.log(fmt.green("  ✓ OTC whitelist applied"));
    console.log(`  OTC link:   ${fmt.cyan(otcResult.otcLink)}`);
    console.log();

    // Sanity check: getOtcLink() is a pure function — no tx, no API call.
    console.log(fmt.dim(`  getOtcLink(): ${getOtcLink(result.depositId)}`));
    console.log();
    console.log(fmt.dim("  To unrestrict later: disableOtc(walletClient, depositId)"));
    console.log();
    // disableOtc example (not executed by default — uncomment to run):
    // await disableOtc(walletClient, result.depositId);
    void disableOtc; // keep the import live in retrofit-only builds
  } catch (err) {
    const error = err as OfframpError;
    console.log();
    console.log(fmt.red(`  ✗ ${error.message}`));
    if (error.code) console.log(fmt.dim(`    Code: ${error.code}`));
    if (error.step) console.log(fmt.dim(`    Step: ${error.step}`));
    if (error.depositId) console.log(fmt.dim(`    Deposit: #${error.depositId}`));
    console.log();
    process.exit(1);
  }
}

main();
