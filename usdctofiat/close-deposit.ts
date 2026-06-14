/**
 * close-deposit.ts
 *
 * Withdraws remaining USDC and closes a deposit.
 *
 * Usage:
 *   npx tsx usdctofiat/close-deposit.ts <deposit-id>
 *
 * Required:
 *   PRIVATE_KEY    Hex private key (0x...) that owns the deposit
 */

import { close } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const depositId = process.argv[2];

if (!PRIVATE_KEY) { console.error("Set PRIVATE_KEY env var"); process.exit(1); }
if (!depositId) { console.error("Usage: npx tsx usdctofiat/close-deposit.ts <deposit-id>"); process.exit(1); }

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: base, transport: http(process.env.RPC_URL ?? "https://mainnet.base.org") });

  console.log();
  console.log(fmt.bold(`  Closing deposit #${depositId}`));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();

  const txHash = await close(walletClient, depositId);
  console.log(fmt.green("  ✓ Deposit closed"));
  console.log(fmt.dim(`  Tx: ${txHash}`));
  console.log();
}

main().catch((err) => { console.error(`  ✗ ${err.message ?? err}`); process.exit(1); });
