/**
 * timeseries-chart.ts
 *
 * Renders a terminal sparkbar chart of protocol volume, deposits, or intents
 * over time using the Peerlytics historical time-series API.
 *
 * Pro tier: 20 credits per call. Grab a key at
 * https://peerlytics.xyz/developers → Account.
 *
 * Uses `client.getTimeseries(...)` from @peerlytics/sdk.
 *
 * Usage:
 *   ENTITY=volume GRANULARITY=day PEERLYTICS_API_KEY=pk_…  \
 *     npx tsx peerlytics/timeseries-chart.ts
 *
 * Optional:
 *   ENTITY              deposits | intents | volume (default: volume)
 *   GRANULARITY         hour | day (default: day)
 *   FROM                ISO-8601 or unix seconds (default 30d ago)
 *   TO                  ISO-8601 or unix seconds (default now)
 *   PEERLYTICS_BASE_URL Default https://peerlytics.xyz
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

const apiKey = process.env.PEERLYTICS_API_KEY;
if (!apiKey) {
  console.error(
    "Set PEERLYTICS_API_KEY. Pro-tier endpoint (20 credits/call). Key: https://peerlytics.xyz/developers",
  );
  process.exit(1);
}

type Entity = "deposits" | "intents" | "volume";
type Granularity = "hour" | "day";

const entity = (process.env.ENTITY ?? "volume") as Entity;
const granularity = (process.env.GRANULARITY ?? "day") as Granularity;
const fromRaw = process.env.FROM;
const toRaw = process.env.TO;
const baseUrl = process.env.PEERLYTICS_BASE_URL ?? "https://peerlytics.xyz";

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

function formatValue(value: number): string {
  if (entity === "volume") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  return value.toLocaleString();
}

function sparkbar(value: number, max: number, width = 36): string {
  if (max <= 0) return "░".repeat(width);
  const scaled = Math.round((value / max) * width);
  return "█".repeat(Math.min(width, scaled)) + "░".repeat(Math.max(0, width - scaled));
}

/** Accept either ISO-8601 or unix seconds; leave undefined to let the API default. */
function parseBoundary(value: string | undefined): string | number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

async function main(): Promise<void> {
  const client = new Peerlytics({ apiKey, baseUrl });

  const data = await client.getTimeseries({
    entity,
    granularity,
    from: parseBoundary(fromRaw),
    to: parseBoundary(toRaw),
  });

  if (!data.buckets.length) {
    console.log("No buckets in this window.");
    return;
  }

  const max = data.buckets.reduce((acc, b) => Math.max(acc, b.value), 0);
  const total = data.buckets.reduce((acc, b) => acc + b.value, 0);

  console.log();
  console.log(fmt.bold(`  ${entity.toUpperCase()} · ${granularity}ly`));
  console.log(
    fmt.dim(
      `  ${data.from.slice(0, 10)} → ${data.to.slice(0, 10)}  ·  ${data.buckets.length} buckets  ·  ${data.cached ? "cached" : "fresh"}`,
    ),
  );
  console.log();

  for (const bucket of data.buckets) {
    const label = granularity === "hour" ? bucket.bucket.slice(5, 16) : bucket.bucket;
    const bar = sparkbar(bucket.value, max);
    const value = formatValue(bucket.value);
    console.log(`  ${fmt.dim(label.padEnd(14))} ${fmt.green(bar)} ${fmt.cyan(value)}`);
  }

  console.log();
  console.log(`  total: ${fmt.cyan(formatValue(total))}  ·  peak: ${fmt.cyan(formatValue(max))}`);
  console.log();
}

main().catch((err) => {
  if (err instanceof PeerlyticsError) {
    console.error(`Peerlytics ${err.status} ${err.code}: ${err.message}`);
    if (err.code === "insufficient_credits") {
      console.error(fmt.dim("  Top up credits at https://peerlytics.xyz/developers?tab=account"));
    }
    process.exit(1);
  }
  console.error("Request failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

export {};
