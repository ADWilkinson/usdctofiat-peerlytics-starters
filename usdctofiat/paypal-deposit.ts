/**
 * paypal-deposit.ts
 *
 * PayPal makers are gated on Peer (PeerAuth) browser extension registration
 * (upstream zkp2p-clients #649). A Node CLI can't drive that handshake
 * directly — the Peer extension only lives in a browser — so this script
 * demonstrates the graceful fallback: detect the new
 * EXTENSION_REGISTRATION_REQUIRED error from @usdctofiat/offramp and
 * print a clear message pointing the operator at usdctofiat.xyz (where the
 * React surface can complete the handshake).
 *
 * Usage:
 *   npx tsx usdctofiat/paypal-deposit.ts
 *
 * Required:
 *   PRIVATE_KEY     Hex private key (0x...) with USDC balance on Base
 *   PAYPAL_USERNAME Your paypal.me username (NOT your email)
 *
 * Optional:
 *   AMOUNT          USDC amount (default: 1)
 */

import {
  offramp,
  PLATFORMS,
  CURRENCIES,
  OFFRAMP_ERROR_CODES,
  OfframpError,
  getPeerExtensionRegistrationInfo,
} from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PAYPAL_USERNAME = process.env.PAYPAL_USERNAME;

if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var (hex, 0x-prefixed).");
  process.exit(1);
}
if (!PAYPAL_USERNAME) {
  console.error("Set PAYPAL_USERNAME env var (your paypal.me username, not your email).");
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

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.RPC_URL ?? "https://mainnet.base.org"),
  });

  // Validate + normalize locally before sending anything onchain. The SDK
  // accepts `paypal.me/alice`, `@alice`, or `alice` — all normalize to the
  // bare lowercase username used as the offchainId.
  const validation = PLATFORMS.PAYPAL.validate(PAYPAL_USERNAME as string);
  if (!validation.valid) {
    console.error(fmt.red(`  ✗ Invalid PayPal.me username: ${validation.error}`));
    console.error(fmt.dim(`    ${PLATFORMS.PAYPAL.identifier.help}`));
    process.exit(1);
  }

  console.log();
  console.log(fmt.bold("  USDCtoFiat Offramp — PayPal"));
  console.log(fmt.dim(`  ${account.address}`));
  console.log();
  console.log(`  Amount:     ${fmt.cyan(amount + " USDC")}`);
  console.log(`  Platform:   ${PLATFORMS.PAYPAL.name}`);
  console.log(`  Currency:   ${CURRENCIES.USD.code} (${CURRENCIES.USD.symbol})`);
  console.log(`  Recipient:  paypal.me/${validation.normalized}`);
  console.log();

  try {
    const result = await offramp(walletClient, {
      amount,
      platform: PLATFORMS.PAYPAL,
      currency: CURRENCIES.USD,
      identifier: validation.normalized,
    });

    console.log();
    console.log(fmt.green(`  ✓ Deposit ${result.resumed ? "resumed" : "created"}`));
    console.log(`  Deposit ID: ${fmt.bold(result.depositId)}`);
    console.log(`  Tx hash:    ${fmt.dim(result.txHash)}`);
    console.log();
  } catch (err) {
    if (!(err instanceof OfframpError)) {
      console.log();
      console.log(fmt.red(`  ✗ ${err instanceof Error ? err.message : String(err)}`));
      console.log();
      process.exit(1);
    }

    // Curator rejects extension-gated makers until the user has registered
    // their handle inside the PeerAuth browser extension. This example uses
    // PayPal, but the same recovery shape applies to Wise, Venmo, and Cash App.
    // A Node CLI can't drive that handshake; print a clear recovery path.
    if (err.code === OFFRAMP_ERROR_CODES.EXTENSION_REGISTRATION_REQUIRED) {
      const info = getPeerExtensionRegistrationInfo("paypal");
      console.log();
      console.log(fmt.yellow("  ⚠ Peer extension registration required"));
      console.log();
      console.log(`  ${info?.requiredPrompt ?? err.message}`);
      console.log();
      console.log(fmt.dim("  How to recover:"));
      console.log(fmt.dim("    1. Install the Peer (PeerAuth) browser extension"));
      console.log(fmt.dim("       https://chromewebstore.google.com/detail/peerauth-authenticate-and/ijpgccednehjpeclfcllnjjcmiohdjih"));
      console.log(fmt.dim("    2. Open usdctofiat.xyz, approve the Peer connection prompt"));
      console.log(fmt.dim("    3. Complete PayPal registration in the Peer extension with the"));
      console.log(fmt.dim("       SAME paypal.me username you passed to this script"));
      console.log(fmt.dim("    4. Re-run this script"));
      if (info?.ctaSubtext) {
        console.log();
        console.log(fmt.dim(`  Note: ${info.ctaSubtext}`));
      }
      console.log();
      process.exit(2);
    }

    console.log();
    console.log(fmt.red(`  ✗ ${err.message}`));
    console.log(fmt.dim(`    Code: ${err.code}`));
    if (err.step) console.log(fmt.dim(`    Step: ${err.step}`));
    console.log();
    process.exit(1);
  }
}

main();
