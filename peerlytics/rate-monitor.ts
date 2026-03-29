/**
 * rate-monitor.ts
 *
 * Polls market rates for a fiat currency and alerts when the best
 * available rate crosses a configurable threshold.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx rate-monitor.ts
 *
 * Environment:
 *   PEERLYTICS_API_KEY  - API key (get one at peerlytics.xyz/developers)
 *   CURRENCY            - Fiat currency to watch (default: GBP)
 *   THRESHOLD           - Alert when best rate drops below this (default: 1.02)
 *   POLL_SECONDS        - Polling interval (default: 60)
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

// ── Config ──────────────────────────────────────────────────────

const CURRENCY = process.env.CURRENCY ?? "GBP";
const THRESHOLD = Number(process.env.THRESHOLD ?? "1.02");
const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? "60");

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  rate: (n: number) => n.toFixed(4),
  time: () => new Date().toISOString().slice(11, 19),
};

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Monitor ─────────────────────────────────────────────────────

async function checkRates(): Promise<void> {
  const { markets } = await client.getMarketSummary({ currency: CURRENCY });

  if (!markets || markets.length === 0) {
    console.log(`${fmt.dim(fmt.time())}  No market data for ${CURRENCY}`);
    return;
  }

  let bestRate = Infinity;
  let bestPlatform = "";

  for (const m of markets) {
    const rate = m.median ?? m.suggestedRate;
    if (rate != null && rate > 0 && rate < bestRate) {
      bestRate = rate;
      bestPlatform = m.platform;
    }
  }

  if (bestRate === Infinity) {
    console.log(`${fmt.dim(fmt.time())}  No active rates for ${CURRENCY}`);
    return;
  }

  const alert = bestRate <= THRESHOLD;
  const tag = alert ? fmt.red("ALERT") : fmt.green("  OK ");
  const rateStr = alert ? fmt.red(fmt.rate(bestRate)) : fmt.rate(bestRate);

  console.log(
    `${fmt.dim(fmt.time())}  ${tag}  ${CURRENCY} ${rateStr} on ${bestPlatform}` +
      `  ${fmt.dim("threshold " + fmt.rate(THRESHOLD))}`,
  );
}

async function main(): Promise<void> {
  console.log();
  console.log(`  ┌─────────────────────────────────────────┐`);
  console.log(`  │  ${fmt.bold("Rate Monitor")}                           │`);
  console.log(`  ├─────────────────────────────────────────┤`);
  console.log(`  │  Currency   ${CURRENCY.padEnd(28)}│`);
  console.log(`  │  Threshold  ${fmt.rate(THRESHOLD).padEnd(28)}│`);
  console.log(`  │  Interval   ${(POLL_SECONDS + "s").padEnd(28)}│`);
  console.log(`  │  Auth       ${(process.env.PEERLYTICS_API_KEY ? "API key" : "not set!").padEnd(28)}│`);
  console.log(`  └─────────────────────────────────────────┘`);
  console.log();

  await checkRates();

  setInterval(async () => {
    try {
      await checkRates();
    } catch (err) {
      if (err instanceof PeerlyticsError) {
        console.error(`${fmt.dim(fmt.time())}  ${fmt.red("ERR")}  ${err.message}`);
      } else {
        console.error(`${fmt.dim(fmt.time())}  ${fmt.red("ERR")}  ${err instanceof Error ? err.message : err}`);
      }
    }
  }, POLL_SECONDS * 1000);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
