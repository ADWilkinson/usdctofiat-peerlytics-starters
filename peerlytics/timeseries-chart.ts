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

const validEntities: Entity[] = ["deposits", "intents", "volume"];
const validGranularities: Granularity[] = ["hour", "day"];
const entityInput = process.env.ENTITY ?? "volume";
const granularityInput = process.env.GRANULARITY ?? "day";

if (!validEntities.includes(entityInput as Entity)) {
  console.error(`Set ENTITY to one of: ${validEntities.join(", ")}`);
  process.exit(1);
}
if (!validGranularities.includes(granularityInput as Granularity)) {
  console.error(`Set GRANULARITY to one of: ${validGranularities.join(", ")}`);
  process.exit(1);
}

const entity = entityInput as Entity;
const granularity = granularityInput as Granularity;
const fromRaw = process.env.FROM;
const toRaw = process.env.TO;
const baseUrl = process.env.PEERLYTICS_BASE_URL ?? "https://peerlytics.xyz";
const MAX_WINDOW_MILLIS = 400 * 24 * 60 * 60 * 1000;

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
function parseBoundary(
  value: string | undefined,
  envKey: "FROM" | "TO",
): string | number | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Set ${envKey} to ISO-8601 or finite unix seconds`);
  }
  const unixSeconds = Number(normalized);
  if (Number.isFinite(unixSeconds)) return unixSeconds;

  const looksIso8601 = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(normalized);
  if (!looksIso8601 || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`Set ${envKey} to ISO-8601 or finite unix seconds`);
  }
  return normalized;
}

function boundaryMillis(boundary: string | number): number {
  return typeof boundary === "number" ? boundary * 1000 : Date.parse(boundary);
}

async function main(): Promise<void> {
  const from = parseBoundary(fromRaw, "FROM");
  const to = parseBoundary(toRaw, "TO");
  if (
    from !== undefined &&
    to !== undefined &&
    boundaryMillis(from) >= boundaryMillis(to)
  ) {
    throw new Error("Set FROM to a time before TO");
  }
  if (
    from !== undefined &&
    to !== undefined &&
    boundaryMillis(to) - boundaryMillis(from) > MAX_WINDOW_MILLIS
  ) {
    throw new Error("Set FROM and TO to a window of at most 400 days");
  }

  const client = new Peerlytics({ apiKey, baseUrl });

  const data = await client.getTimeseries({
    entity,
    granularity,
    from,
    to,
  });

  // `buckets` is the global single-series payload (null when groupBy is set).
  // This script never sets groupBy, so buckets is the populated path.
  const buckets = data.buckets ?? [];
  if (!buckets.length) {
    console.log("No buckets in this window.");
    return;
  }

  const max = buckets.reduce((acc, b) => Math.max(acc, b.value), 0);
  const total = buckets.reduce((acc, b) => acc + b.value, 0);

  console.log();
  console.log(fmt.bold(`  ${entity.toUpperCase()} · ${granularity}ly`));
  console.log(
    fmt.dim(
      `  ${data.from.slice(0, 10)} → ${data.to.slice(0, 10)}  ·  ${buckets.length} buckets  ·  ${data.cached ? "cached" : "fresh"}`,
    ),
  );
  console.log();

  for (const bucket of buckets) {
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
