/**
 * live-activity.ts
 *
 * Polls the activity feed and streams real-time protocol events
 * (signals, fills, rate updates) with color-coded output.
 *
 * Usage:
 *   PEERLYTICS_API_KEY=pk_live_... npx tsx live-activity.ts
 *
 * Environment:
 *   PEERLYTICS_API_KEY  - API key (optional, falls back to free tier)
 *   POLL_SECONDS        - Polling interval (default: 10)
 *   EVENT_TYPE          - Filter by type: signal, fill, rate_update, etc. (default: all)
 */

import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

// ── Config ──────────────────────────────────────────────────────

const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? "10");
const EVENT_TYPE = process.env.EVENT_TYPE;

// ── Formatting ──────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  usd: (n: number | string) => {
    const v = Number(n);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    if (v >= 1) return `$${v.toFixed(2)}`;
    return `$${v.toFixed(0)}`;
  },
  addr: (s: string) => (s.length <= 12 ? s : `${s.slice(0, 6)}...${s.slice(-4)}`),
  time: () => new Date().toISOString().slice(11, 19),
  pad: (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length)),
};

// Event type colors and labels
const EVENT_STYLES: Record<string, { color: (s: string) => string; icon: string }> = {
  signal: { color: fmt.cyan, icon: "◈" },
  intent_signaled: { color: fmt.cyan, icon: "◈" },
  fill: { color: fmt.green, icon: "●" },
  intent_fulfilled: { color: fmt.green, icon: "●" },
  fulfillment: { color: fmt.green, icon: "●" },
  deposit_created: { color: fmt.magenta, icon: "+" },
  deposit: { color: fmt.magenta, icon: "+" },
  rate_update: { color: fmt.yellow, icon: "↕" },
  rate_change: { color: fmt.yellow, icon: "↕" },
  withdrawal: { color: fmt.red, icon: "−" },
  withdraw: { color: fmt.red, icon: "−" },
};

function getStyle(type: string): { color: (s: string) => string; icon: string } {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  return EVENT_STYLES[normalized] ?? { color: fmt.dim, icon: "·" };
}

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Activity Feed ───────────────────────────────────────────────

const seen = new Set<string>();

function eventKey(event: Record<string, unknown>): string {
  // Derive a unique key from available fields
  const hash = event.intentHash ?? event.hash ?? event.id ?? event.txHash ?? "";
  const type = event.type ?? event.eventType ?? "";
  const ts = event.timestamp ?? event.blockTimestamp ?? "";
  return `${type}-${hash}-${ts}`;
}

function renderEvent(event: Record<string, unknown>): void {
  const type = String(event.type ?? event.eventType ?? "event");
  const style = getStyle(type);

  const amount = event.amount ?? event.usdcAmount ?? event.value;
  const currency = event.currency ?? event.fiatCurrency ?? "";
  const platform = event.platform ?? event.paymentPlatform ?? "";
  const from = event.from ?? event.depositor ?? event.maker ?? event.taker ?? "";
  const depositId = event.depositId ?? "";
  const rate = event.rate ?? event.conversionRate;

  let detail = "";

  if (amount) detail += `${fmt.usd(Number(amount))} `;
  if (currency) detail += `${currency} `;
  if (platform) detail += `${fmt.dim("on")} ${platform} `;
  if (rate) detail += `${fmt.dim("@")} ${Number(rate).toFixed(4)} `;
  if (from) detail += `${fmt.dim("by")} ${fmt.addr(String(from))} `;
  if (depositId) detail += `${fmt.dim("deposit")} ${String(depositId).slice(0, 8)} `;

  const typeLabel = style.color(fmt.pad(type.toUpperCase(), 18));
  console.log(`  ${fmt.dim(fmt.time())}  ${style.color(style.icon)} ${typeLabel} ${detail.trim()}`);
}

async function poll(): Promise<void> {
  const params: Record<string, unknown> = { limit: 20 };
  if (EVENT_TYPE) params.type = EVENT_TYPE;

  const activity = await client.getActivity(params as Parameters<typeof client.getActivity>[0]);
  const events = activity.events ?? activity.activities ?? [];

  // Process newest first, but display in chronological order
  const newEvents: Record<string, unknown>[] = [];

  for (const event of events) {
    const key = eventKey(event as Record<string, unknown>);
    if (!seen.has(key)) {
      seen.add(key);
      newEvents.push(event as Record<string, unknown>);
    }
  }

  // Reverse so oldest prints first
  newEvents.reverse();

  for (const event of newEvents) {
    renderEvent(event);
  }
}

async function main(): Promise<void> {
  console.log();
  console.log(`  ┌─────────────────────────────────────────┐`);
  console.log(`  │  ${fmt.bold("Live Activity Feed")}                      │`);
  console.log(`  ├─────────────────────────────────────────┤`);
  console.log(`  │  Interval   ${(POLL_SECONDS + "s").padEnd(28)}│`);
  console.log(`  │  Filter     ${(EVENT_TYPE ?? "all events").padEnd(28)}│`);
  console.log(`  │  Auth       ${(process.env.PEERLYTICS_API_KEY ? "API key" : "free tier").padEnd(28)}│`);
  console.log(`  └─────────────────────────────────────────┘`);
  console.log();

  console.log(`  ${fmt.dim("Legend:")} ${fmt.cyan("◈ signal")}  ${fmt.green("● fill")}  ${fmt.magenta("+ deposit")}  ${fmt.yellow("↕ rate")}  ${fmt.red("− withdraw")}`);
  console.log(`  ${"─".repeat(60)}`);
  console.log();

  // Initial fetch
  await poll();

  // Continuous polling
  setInterval(async () => {
    try {
      await poll();
    } catch (err) {
      if (err instanceof PeerlyticsError) {
        console.error(`  ${fmt.dim(fmt.time())}  ${fmt.red("ERR")} ${err.message}`);
      } else {
        console.error(`  ${fmt.dim(fmt.time())}  ${fmt.red("ERR")} ${err instanceof Error ? err.message : err}`);
      }
    }
  }, POLL_SECONDS * 1000);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
