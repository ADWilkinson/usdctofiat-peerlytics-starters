import { Peerlytics } from "@peerlytics/sdk";
import type { OrderbookCurrency } from "@peerlytics/sdk";

type SupportedPlatformId = "revolut" | "venmo";
type SupportedCurrencyCode = "GBP" | "USD" | "EUR";

export type OrderbookSnapshot = {
  orderbook: OrderbookCurrency | null;
  updatedAt: string;
};

const supportedRoutes: Record<SupportedPlatformId, readonly SupportedCurrencyCode[]> = {
  revolut: ["GBP", "USD", "EUR"],
  venmo: ["USD"],
};

let client: Peerlytics | null = null;
let activeApiKey = "";

export function getPeerlyticsApiKey(): string {
  const env =
    (
      globalThis as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  return env.PEERLYTICS_API_KEY?.trim() ?? env.VITE_PEERLYTICS_API_KEY?.trim() ?? "";
}

export function isSupportedRoute(
  platform: string,
  currency: string,
): platform is SupportedPlatformId {
  const allowedCurrencies = supportedRoutes[platform as SupportedPlatformId];

  return Boolean(allowedCurrencies?.includes(currency as SupportedCurrencyCode));
}

export async function fetchOrderbookSnapshot(
  platform: string,
  currency: string,
): Promise<OrderbookSnapshot> {
  if (!isSupportedRoute(platform, currency)) {
    throw new Error("Unsupported route.");
  }

  const nextApiKey = getPeerlyticsApiKey();

  if (!nextApiKey) {
    throw new Error("Missing PEERLYTICS_API_KEY.");
  }

  if (!client || activeApiKey !== nextApiKey) {
    activeApiKey = nextApiKey;
    client = new Peerlytics({ apiKey: nextApiKey });
  }

  const response = await client.getOrderbook({
    currency,
    platform,
  });

  return {
    orderbook:
      response.orderbooks.find((entry) => entry.currency === currency) ?? null,
    updatedAt: new Date().toISOString(),
  };
}

const MAX_ERROR_LENGTH = 200;
const FALLBACK_ERROR = "Unable to load orderbook.";
const MARKUP_PATTERN = /<!doctype\s+html|<html[\s>]/i;

/**
 * Turn whatever the SDK threw into one short line the browser can render.
 *
 * When the Peerlytics API is unreachable the request falls through to the
 * site's HTML 404 page, and the SDK hands that whole document back as the
 * error message. Forwarding it verbatim puts a ~46KB page into the JSON error
 * field and paints it into the orderbook panel as the error text, so strip any
 * markup body and cap what is left.
 */
export function describeUpstreamError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const markupAt = raw.search(MARKUP_PATTERN);
  const prose = (markupAt === -1 ? raw : raw.slice(0, markupAt))
    .replace(/\s+/g, " ")
    .trim();

  if (markupAt !== -1) {
    const suffix = "Peerlytics answered with an HTML page instead of JSON.";
    return prose ? `${truncate(prose)} ${suffix}` : suffix;
  }

  return prose ? truncate(prose) : FALLBACK_ERROR;
}

function truncate(value: string): string {
  return value.length > MAX_ERROR_LENGTH
    ? `${value.slice(0, MAX_ERROR_LENGTH - 1).trimEnd()}…`
    : value;
}
