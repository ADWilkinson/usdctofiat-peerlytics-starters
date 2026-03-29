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
 *   PEERLYTICS_API_KEY  - API key (get one at peerlytics.xyz/developers)
 *   POLL_SECONDS        - Polling interval (default: 10)
 *   EVENT_TYPE          - Filter by type: intent_signaled, intent_fulfilled, etc. (default: all)
 */

import type { LiveEvent, EventType, ActivityFilters } from "@peerlytics/sdk";
import { Peerlytics, PeerlyticsError } from "@peerlytics/sdk";

// ── Config ──────────────────────────────────────────────────────

const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? "10");
const EVENT_TYPE = process.env.EVENT_TYPE as EventType | undefined;

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
  intent_signaled: { color: fmt.cyan, icon: "◈" },
  intent_fulfilled: { color: fmt.green, icon: "●" },
  intent_pruned: { color: fmt.red, icon: "✕" },
  deposit_created: { color: fmt.magenta, icon: "+" },
  deposit_topup: { color: fmt.magenta, icon: "↑" },
  deposit_withdrawn: { color: fmt.red, icon: "−" },
  deposit_closed: { color: fmt.red, icon: "×" },
  deposit_rate_updated: { color: fmt.yellow, icon: "↕" },
};

function getStyle(type: string): { color: (s: string) => string; icon: string } {
  return EVENT_STYLES[type] ?? { color: fmt.dim, icon: "·" };
}

// ── Client ──────────────────────────────────────────────────────

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// ── Activity Feed ───────────────────────────────────────────────

const seen = new Set<string>();

function eventKey(event: LiveEvent): string {
  const hash = event.intentHash ?? event.id ?? "";
  return `${event.type}-${hash}-${event.timestamp}`;
}

function renderEvent(event: LiveEvent): void {
  const style = getStyle(event.type);

  let detail = "";

  if (event.amountUsd != null) detail += `${fmt.usd(event.amountUsd)} `;
  if (event.currency) detail += `${event.currency} `;
  if (event.platform) detail += `${fmt.dim("on")} ${event.platform} `;
  if (event.conversionRate) detail += `${fmt.dim("@")} ${Number(event.conversionRate).toFixed(4)} `;
  if (event.depositor) detail += `${fmt.dim("by")} ${fmt.addr(event.depositor)} `;
  else if (event.owner) detail += `${fmt.dim("by")} ${fmt.addr(event.owner)} `;
  if (event.depositId) detail += `${fmt.dim("deposit")} ${event.depositId.slice(0, 8)} `;

  const typeLabel = style.color(fmt.pad(event.type.toUpperCase(), 22));
  console.log(`  ${fmt.dim(fmt.time())}  ${style.color(style.icon)} ${typeLabel} ${detail.trim()}`);
}

async function poll(): Promise<void> {
  const filters: ActivityFilters = { limit: 20 };
  if (EVENT_TYPE) filters.type = EVENT_TYPE;

  const activity = await client.getActivity(filters);

  // Process newest first, but display in chronological order
  const newEvents: LiveEvent[] = [];

  for (const event of activity.events) {
    const key = eventKey(event);
    if (!seen.has(key)) {
      seen.add(key);
      newEvents.push(event);
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
  console.log(`  │  Auth       ${(process.env.PEERLYTICS_API_KEY ? "API key" : "not set!").padEnd(28)}│`);
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
