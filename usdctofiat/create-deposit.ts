/**
 * create-deposit.ts
 *
 * Creates a USDC-to-fiat cash-out on Base in "best" mode, which delegates
 * pricing to the managed rate manager.
 *
 * Usage:
 *   npx tsx usdctofiat/create-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY      Hex private key (0x...) with USDC balance on Base
 *   REVOLUT_REV_TAG  Revolut Revtag that should receive the fiat payout
 *
 * Optional:
 *   AMOUNT         USDC amount (default: 1)
 */

import { CURRENCIES, PLATFORMS, cashout } from "@usdctofiat/offramp";
import { createWalletClient, http, parseUnits } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const REVOLUT_REV_TAG = process.env.REVOLUT_REV_TAG?.trim();
if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed)");
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

const amount = (process.env.AMOUNT ?? "1").trim();
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
};

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http(process.env.RPC_URL ?? "https://mainnet.base.org") });

  console.log();
  console.log(fmt.bold("  USDCtoFiat Offramp"));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${PLATFORMS.REVOLUT.name}`);
  console.log(`  Currency:   ${CURRENCIES.USD.code} (${CURRENCIES.USD.symbol})`);
  console.log(`  Recipient:  @${revolutRevTag}`);
  console.log();

  try {
    const result = await cashout({
      mode: "best",
      signer: walletClient,
      amount,
      platform: "revolut",
      currency: "USD",
      payee: revolutRevTag,
    });
    if (result.mode !== "best") throw new Error("Unexpected cash-out mode");

    console.log();
    console.log(fmt.green(`  ✓ Deposit ${result.resumed ? "resumed" : "created"} and delegated`));
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
    console.log();
  } catch (err) {
    const error = err as Error & { code?: string; depositId?: string; txHash?: string };
    console.log();
    console.log(fmt.red(`  ✗ ${error.message}`));
    if (error.code) console.log(fmt.dim(`    Code: ${error.code}`));
    if (error.depositId) console.log(fmt.dim(`    Deposit: ${error.depositId}`));
    if (error.txHash) console.log(fmt.dim(`    Tx hash: ${error.txHash}`));
    console.log();
    process.exit(1);
  }
}

main();
