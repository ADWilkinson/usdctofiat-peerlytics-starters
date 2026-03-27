/**
 * x402-agent.ts
 *
 * Demonstrates the x402 pay-per-request flow for accessing the
 * Peerlytics API without an API key. Uses USDC on Base for
 * per-request micropayments via the x402 protocol.
 *
 * This example:
 *   1. Makes an unauthenticated request to trigger a 402
 *   2. Parses the payment requirements from the response
 *   3. Shows where to integrate @x402/evm for signing
 *   4. Demonstrates the retry with payment header
 *
 * Usage:
 *   npx tsx x402-agent.ts
 *
 * For a full working payment flow, install:
 *   npm install @x402/evm viem
 */

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const BASE_URL = "https://peerlytics.xyz";
const ENDPOINT = "/api/v1/analytics/summary";

// ── Flow ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log();
  console.log(`  ${fmt.bold("x402 Pay-Per-Request Flow")}`);
  console.log(`  ${"─".repeat(50)}`);
  console.log();

  // Step 1: Trigger 402
  console.log(`  ${fmt.green("1.")} Request without authentication`);
  console.log(`     ${fmt.dim("GET")} ${BASE_URL}${ENDPOINT}`);
  console.log();

  const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
    headers: { Accept: "application/json" },
  });

  console.log(`     Status: ${response.status} ${response.statusText}`);
  console.log();

  if (response.status !== 402) {
    console.log(`     ${fmt.dim("Free tier quota available -- 402 flow activates when exhausted.")}`);
    const data = await response.json();
    const preview = JSON.stringify(data).slice(0, 120);
    console.log(`     ${fmt.dim("Response:")} ${preview}...`);
    console.log();
    return;
  }

  // Step 2: Parse payment requirements
  console.log(`  ${fmt.green("2.")} Parse payment requirements`);
  console.log();

  const rawHeader = response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");

  if (!rawHeader) {
    console.log(`     ${fmt.dim("No payment requirements in headers.")}`);
    return;
  }

  let requirements: Record<string, unknown>;
  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf-8");
    requirements = JSON.parse(decoded);
  } catch {
    requirements = JSON.parse(rawHeader);
  }

  console.log(`     Network     Base (chain 8453)`);
  console.log(`     Token       USDC`);
  console.log(`     Amount      ${JSON.stringify(requirements.maxAmountRequired ?? requirements.amount)}`);
  console.log(`     Recipient   ${requirements.payeeAddress ?? requirements.receiver}`);
  console.log();

  // Step 3: Build payment
  console.log(`  ${fmt.green("3.")} Build and sign payment`);
  console.log();
  console.log(`     ${fmt.dim("Install:")} npm install @x402/evm viem`);
  console.log();
  console.log(`     ${fmt.cyan(`import { PaymentClient } from "@x402/evm";`)}`);
  console.log(`     ${fmt.cyan(`const payment = await paymentClient.createPayment(requirements);`)}`);
  console.log(`     ${fmt.cyan(`const header = Buffer.from(JSON.stringify(payment)).toString("base64");`)}`);
  console.log();

  // Step 4: Retry
  console.log(`  ${fmt.green("4.")} Retry with payment header`);
  console.log();
  console.log(`     ${fmt.cyan(`const res = await fetch("${BASE_URL}${ENDPOINT}", {`)}`);
  console.log(`     ${fmt.cyan(`  headers: { "PAYMENT-SIGNATURE": header },`)}`);
  console.log(`     ${fmt.cyan(`});`)}`);
  console.log();
  console.log(`     ${fmt.dim("On success, check response headers:")}`);
  console.log(`     ${fmt.dim("X-Payment-TxHash      on-chain settlement tx")}`);
  console.log(`     ${fmt.dim("PAYMENT-RESPONSE      settlement confirmation")}`);
  console.log();
  console.log(`  ${fmt.dim("Docs:")} https://peerlytics.xyz/developers`);
  console.log(`  ${fmt.dim("x402:")} https://github.com/coinbase/x402`);
  console.log();
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
