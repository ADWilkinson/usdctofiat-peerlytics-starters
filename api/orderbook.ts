import { Peerlytics } from "@peerlytics/sdk";

const supportedRoutes = {
  revolut: new Set(["GBP", "USD", "EUR"]),
  venmo: new Set(["USD"]),
} as const;

let client: Peerlytics | null = null;
let activeApiKey = "";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const env =
    (
      globalThis as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  const apiKey = env.PEERLYTICS_API_KEY?.trim();
  const platform = typeof req.query.platform === "string" ? req.query.platform : "";
  const currency = typeof req.query.currency === "string" ? req.query.currency : "";

  if (!apiKey) {
    res.status(500).json({ error: "Missing PEERLYTICS_API_KEY." });
    return;
  }

  if (!isSupportedRoute(platform, currency)) {
    res.status(400).json({ error: "Unsupported route." });
    return;
  }

  if (!client || activeApiKey !== apiKey) {
    activeApiKey = apiKey;
    client = new Peerlytics({ apiKey });
  }

  try {
    const response = await client.getOrderbook({
      currency,
      platform,
    });

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=300");
    res.status(200).json({
      orderbook:
        response.orderbooks.find((entry) => entry.currency === currency) ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orderbook.";
    res.status(502).json({ error: message });
  }
}

function isSupportedRoute(platform: string, currency: string): boolean {
  const allowedCurrencies =
    supportedRoutes[platform as keyof typeof supportedRoutes];

  return Boolean(allowedCurrencies?.has(currency));
}
