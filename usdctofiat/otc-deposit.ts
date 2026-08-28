/**
 * otc-deposit.ts
 *
 * Creates a USDC-to-fiat deposit restricted to a single taker wallet (OTC
 * private order), then hands the taker an OTC link.
 *
 * offramp 9 rejects `otcTaker` on fresh creation: the protocol cannot yet
 * create a deposit paused and private in one atomic step, so a fresh private
 * order would leave a public window open between creation and restriction.
 * The supported shape is the one below — create the deposit, let it confirm,
 * then restrict it with `enableOtc()`. `otcTaker` survives only as recovery
 * for an exact existing undelegated deposit.
 *
 * Usage:
 *   npx tsx usdctofiat/otc-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY      Hex private key (0x...) with USDC balance on Base
 *   OTC_TAKER        Taker wallet address (0x...) allowed to fill the deposit
 *   REVOLUT_REV_TAG  Revolut Revtag that should receive the fiat payout
 *
 * Optional:
 *   AMOUNT         USDC amount (default: 1)
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
import { createWalletClient, http, isAddress, parseUnits } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const OTC_TAKER = process.env.OTC_TAKER;
const REVOLUT_REV_TAG = process.env.REVOLUT_REV_TAG?.trim();
const amount = (process.env.AMOUNT ?? "1").trim();

if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
  process.exit(1);
}
if (!OTC_TAKER || !isAddress(OTC_TAKER)) {
  console.error("Set OTC_TAKER env var to the taker's Ethereum address");
  process.exit(1);
}
if (!REVOLUT_REV_TAG) {
  console.error("Set REVOLUT_REV_TAG env var to the payout recipient's Revtag");
  process.exit(1);
}

const revtagValidation = PLATFORMS.REVOLUT.validate(REVOLUT_REV_TAG);
if (!revtagValidation.valid) {
  console.error(`Invalid REVOLUT_REV_TAG: ${revtagValidation.error}`);
  process.exit(1);
}
const revolutRevTag = revtagValidation.normalized;
const taker: string = OTC_TAKER;

if (!/^\d+(?:\.\d{0,6})?$/.test(amount) || parseUnits(amount, 6) < 1_000_000n) {
  console.error("Set AMOUNT to at least 1 USDC with at most 6 decimal places");
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
    transport: http(process.env.RPC_URL ?? "https://mainnet.base.org"),
  });

  console.log();
  console.log(fmt.bold("  USDCtoFiat OTC Deposit"));
  console.log(fmt.dim(`  Owner:  ${account.address}`));
  console.log(fmt.dim(`  Taker:  ${taker}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${PLATFORMS.REVOLUT.name}`);
  console.log(`  Currency:   ${CURRENCIES.USD.code} (${CURRENCIES.USD.symbol})`);
  console.log(`  Recipient:  @${revolutRevTag}`);
  console.log();

  try {
    // Create the deposit first, then restrict the confirmed deposit. offramp 9
    // fails `UNSUPPORTED` if `otcTaker` is passed here, so the taker wallet is
    // always applied after the deposit exists.
    const result = await offramp(
      walletClient,
      {
        amount,
        platform: PLATFORMS.REVOLUT,
        currency: CURRENCIES.USD,
        identifier: revolutRevTag,
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
    console.log(fmt.dim("  To unrestrict later: disableOtc(walletClient, depositId, {})"));
    console.log();
    // disableOtc example (not executed by default — uncomment to run).
    // The options argument is required in offramp 9. Leave it empty and the SDK
    // resolves the exact payment-method set from ProtocolViewer itself; a stale
    // or partial set supplied by hand fails before any policy write.
    // await disableOtc(walletClient, result.depositId, {});
    void disableOtc; // keep the import live while the example stays commented
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
