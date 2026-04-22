/**
 * webhook-receiver.ts
 *
 * Minimal HTTPS receiver for Peerlytics outbound webhooks. Verifies the
 * HMAC-SHA256 signature, rejects replay attempts outside a 5-minute window,
 * and prints each event.
 *
 * Peerlytics delivers these events:
 *   deposit.created
 *   intent.created
 *   intent.filled
 *   rate.updated
 *
 * Headers:
 *   X-Peerlytics-Signature   t=<unix>,v1=<hex>
 *   X-Peerlytics-Event       one of the events above
 *   X-Peerlytics-Delivery-Id uuid
 *
 * Register the public URL at:
 *   https://peerlytics.xyz/developers  →  Account  →  Webhooks
 *
 * Usage:
 *   WEBHOOK_SECRET=whsec_… PORT=8788 npx tsx peerlytics/webhook-receiver.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.WEBHOOK_SECRET;
if (!SECRET) {
  console.error("Set WEBHOOK_SECRET (the value returned once on webhook register)");
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 8788);
const TOLERANCE_SECONDS = Number(process.env.TOLERANCE_SECONDS ?? 300);

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function parseSig(header: string | undefined): { timestamp: number; digestHex: string } | null {
  if (!header) return null;
  let t: number | null = null;
  let v: string | null = null;
  for (const part of header.split(",")) {
    const [k, x] = part.trim().split("=");
    if (k === "t") {
      const n = Number(x);
      if (Number.isFinite(n)) t = n;
    } else if (k === "v1") {
      v = x;
    }
  }
  if (t == null || !v) return null;
  return { timestamp: t, digestHex: v };
}

function verify(rawBody: string, header: string | undefined): string | null {
  const parts = parseSig(header);
  if (!parts) return "missing_signature";
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parts.timestamp) > TOLERANCE_SECONDS) return "stale_timestamp";
  const expected = createHmac("sha256", SECRET!)
    .update(`${parts.timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(parts.digestHex, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return "bad_signature";
  if (!timingSafeEqual(a, b)) return "bad_signature";
  return null;
}

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function reply(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    reply(res, 405, { error: "method_not_allowed" });
    return;
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    reply(res, 413, { error: error instanceof Error ? error.message : "payload_error" });
    return;
  }

  const err = verify(rawBody, header(req, "X-Peerlytics-Signature"));
  if (err) {
    console.log(`${fmt.red("✗")} rejected: ${err}`);
    reply(res, 400, { error: err });
    return;
  }

  const event = header(req, "X-Peerlytics-Event") ?? "unknown";
  const deliveryId = header(req, "X-Peerlytics-Delivery-Id") ?? "";

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    reply(res, 400, { error: "invalid_json" });
    return;
  }

  console.log(
    `${fmt.green("✓")} ${fmt.bold(event)} ${fmt.dim(deliveryId)} ${fmt.cyan(
      new Date().toISOString(),
    )}`,
  );
  console.log(
    fmt.dim("  " + JSON.stringify(payload.data ?? payload, null, 2).split("\n").join("\n  ")),
  );

  reply(res, 200, { ok: true, received: event, deliveryId });
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(fmt.red("handler error:"), error);
    reply(res, 500, { error: "internal" });
  });
}).listen(PORT, () => {
  console.log();
  console.log(fmt.bold("  Peerlytics webhook receiver"));
  console.log(fmt.dim(`  Listening on http://localhost:${PORT}`));
  console.log(fmt.dim(`  Secret length: ${SECRET!.length} chars`));
  console.log(fmt.dim(`  Tolerance:     ${TOLERANCE_SECONDS}s`));
  console.log();
  console.log("  Next steps:");
  console.log("    1. Expose this port publicly (ngrok http " + PORT + ", cloudflared, etc.)");
  console.log("    2. Register the public URL at https://peerlytics.xyz/developers");
  console.log("    3. Choose events like intent.filled or rate.updated");
  console.log("    4. Save the secret returned on register — use it as WEBHOOK_SECRET");
  console.log();
});
