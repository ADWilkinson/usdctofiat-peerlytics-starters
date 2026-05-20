/**
 * x402-agent.ts
 *
 * Demonstrates the x402 pay-per-request flow for accessing the
 * Peerlytics API without an API key. Uses USDC on Base for
 * per-request micropayments via the x402 protocol.
 *
 * This example:
 *   1. Uses @peerlytics/sdk's first-class x402 auth when AGENT_PRIVATE_KEY is set
 *   2. Shows payment-required metadata when no signer is configured
 *   3. Keeps the response shape identical to API-key calls
 *
 * Usage:
 *   AGENT_PRIVATE_KEY=0x... npx tsx peerlytics/x402-agent.ts
 *   npx tsx peerlytics/x402-agent.ts
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";
import { privateKeyToAccount } from "viem/accounts";

// Formatting

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const BASE_URL = "https://peerlytics.xyz";
const ENDPOINT = "/api/v1/analytics/summary";
const privateKey = process.env.AGENT_PRIVATE_KEY;

// Flow

async function main(): Promise<void> {
  console.log();
  console.log(`  ${fmt.bold("Peerlytics x402 SDK Flow")}`);
  console.log(`  ${"-".repeat(50)}`);
  console.log();

  if (privateKey) {
    await runPaidSdkRequest(privateKey as `0x${string}`);
    return;
  }

  console.log(`  ${fmt.green("1.")} No AGENT_PRIVATE_KEY set, probing the 402 challenge`);
  console.log(`     ${fmt.dim("GET")} ${BASE_URL}${ENDPOINT}`);
  console.log();
  const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
    headers: { Accept: "application/json" },
  });

  console.log(`     Status: ${response.status} ${response.statusText}`);
  console.log();

  if (response.status === 200) {
    console.log(`     ${fmt.dim("Endpoint returned without payment. Set AGENT_PRIVATE_KEY to force the SDK x402 path.")}`);
    console.log();
    return;
  }

  if (response.status !== 402) {
    const body = await response.text();
    throw new Error(`Expected 402 or 200, got ${response.status}: ${body.slice(0, 160)}`);
  }

  const rawHeader =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
  if (!rawHeader) {
    throw new Error("No payment requirements header returned.");
  }

  const requirements = parsePaymentRequired(rawHeader);
  const accepts = (requirements.accepts as Array<Record<string, unknown>>) ?? [];
  const first = accepts[0];

  console.log(`  ${fmt.green("2.")} Payment requirements`);
  console.log();
  console.log(`     Network     ${first?.network ?? "eip155:8453"}`);
  console.log(`     Token       USDC (${first?.asset ?? "0x833589..."})`);
  console.log(`     Amount      ${first?.amount ?? "unknown"} (raw units)`);
  console.log(`     Pay to      ${first?.payTo ?? "unknown"}`);
  console.log();
  console.log(`  ${fmt.green("3.")} Run a paid SDK request`);
  console.log();
  console.log(`     ${fmt.cyan("AGENT_PRIVATE_KEY=0x... npx tsx peerlytics/x402-agent.ts")}`);
  console.log();
  console.log(`  ${fmt.dim("Docs:")} https://peerlytics.xyz/developers`);
  console.log();
}

async function runPaidSdkRequest(key: `0x${string}`): Promise<void> {
  const account = privateKeyToAccount(key);
  const client = new Peerlytics({
    auth: {
      mode: "x402",
      signer: account,
      onPaymentRequired: () => {
        console.log(`  ${fmt.green("1.")} Received 402 challenge`);
      },
      onPaymentCreated: () => {
        console.log(`  ${fmt.green("2.")} Signed x402 payment payload`);
      },
      onPaymentSettled: (settlement) => {
        console.log(`  ${fmt.green("3.")} Settled payment ${fmt.dim(settlement.transaction)}`);
      },
    },
  });

  console.log(`  Wallet ${fmt.dim(account.address)}`);
  console.log();

  const { orderbooks } = await client.getOrderbook({ currency: "USD", platform: "venmo" });
  const venmoUsd = orderbooks.find((book) => book.currency === "USD");

  console.log();
  console.log(`  ${fmt.bold("Paid response")}`);
  console.log(`  Best rate: ${fmt.cyan(String(venmoUsd?.bestRate ?? "n/a"))}`);
  console.log(`  Levels:    ${fmt.cyan(String(venmoUsd?.levels.length ?? 0))}`);
  console.log();
}

function parsePaymentRequired(rawHeader: string): Record<string, unknown> {
  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return JSON.parse(rawHeader);
  }
}

main().catch((err) => {
  if (err instanceof PeerlyticsError) {
    console.error("Peerlytics error:", err.status, err.code, err.message);
  } else {
    console.error("Error:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
});

export {};
