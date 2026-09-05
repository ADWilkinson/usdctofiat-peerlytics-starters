/**
 * Production-only audit for a scaffold template, split so an npm audit-endpoint
 * outage is not indistinguishable from a real high/critical advisory (#22).
 *
 * `npm audit --omit=dev --audit-level=high` (added in #20 to close #19) exits 1
 * on a 503 exactly as it does on a genuine advisory, and burns npm's retry
 * budget first — seven minutes of "audit endpoint returned an error" that looks
 * like a security finding. The rational response to that red is "re-run it",
 * which is the reflex that lets an actual advisory through.
 *
 * This wrapper parses `npm audit --json` and decides:
 *   - parsed report, high+critical > 0 → fail (advisory)
 *   - parsed report, high+critical = 0 → pass
 *   - no report shape (outage) → retry a few short attempts, then warn-and-pass
 *     on pull_request/push, fail on schedule/workflow_dispatch
 *
 * npm's own retries are disabled; a spawn timeout bounds each attempt so a down
 * registry cannot stall the templates matrix.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 12_000;
const FETCH_TIMEOUT_MS = 8_000;
const RETRY_GAP_MS = 400;

const args = process.argv.slice(2);
let templateDir = null;
let registry = null;
let failOnOutageFlag = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--fail-on-outage") {
    failOnOutageFlag = true;
    continue;
  }
  if (arg.startsWith("--registry=")) {
    registry = arg.slice("--registry=".length);
    continue;
  }
  if (arg === "--registry") {
    registry = args[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith("-")) {
    console.error(`Unknown flag: ${arg}`);
    process.exit(1);
  }
  if (templateDir) {
    console.error("Usage: node scripts/audit-template.mjs <template-dir> [--registry=url] [--fail-on-outage]");
    process.exit(1);
  }
  templateDir = arg;
}

if (!templateDir) {
  console.error("Usage: node scripts/audit-template.mjs <template-dir> [--registry=url] [--fail-on-outage]");
  process.exit(1);
}

const resolvedDir = path.resolve(templateDir);
if (!fs.existsSync(path.join(resolvedDir, "package.json"))) {
  console.error(`audit-template: ${templateDir} is not a package (missing package.json)`);
  process.exit(1);
}

const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const failOnOutage =
  failOnOutageFlag || eventName === "schedule" || eventName === "workflow_dispatch";

function sleep(ms) {
  spawnSync("sleep", [String(ms / 1000)], { stdio: "ignore" });
}

function parseJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isAuditReport(parsed) {
  const counts = parsed?.metadata?.vulnerabilities;
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    counts !== null &&
    typeof counts === "object" &&
    typeof counts.high === "number" &&
    typeof counts.critical === "number"
  );
}

function runAuditAttempt() {
  const npmArgs = [
    "audit",
    "--json",
    "--omit=dev",
    "--fetch-retries=0",
    "--fetch-retry-mintimeout=0",
    "--fetch-retry-maxtimeout=0",
    `--fetch-timeout=${FETCH_TIMEOUT_MS}`,
  ];
  if (registry) npmArgs.push(`--registry=${registry}`);

  return spawnSync("npm", npmArgs, {
    cwd: resolvedDir,
    encoding: "utf8",
    timeout: ATTEMPT_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_fetch_retries: "0",
      npm_config_fetch_retry_mintimeout: "0",
      npm_config_fetch_retry_maxtimeout: "0",
      npm_config_fetch_timeout: String(FETCH_TIMEOUT_MS),
    },
  });
}

function describeSpawnFailure(result) {
  if (result.error?.code === "ETIMEDOUT" || result.error?.killed) {
    return `npm audit timed out after ${ATTEMPT_TIMEOUT_MS}ms`;
  }
  if (result.error) {
    return result.error.message;
  }
  const parsed = parseJsonObject(`${result.stdout}\n${result.stderr}`);
  if (parsed?.error?.summary) return parsed.error.summary;
  if (parsed?.message) return parsed.message;
  const stderr = (result.stderr ?? "").trim();
  if (stderr) return stderr.split("\n").at(-1);
  return `npm audit exited ${result.status}`;
}

function namedHighCritical(report) {
  return Object.values(report.vulnerabilities ?? {}).filter(
    (entry) => entry?.severity === "high" || entry?.severity === "critical",
  );
}

let lastOutageReason = "npm audit endpoint unreachable";

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = runAuditAttempt();
  if (result.error?.code === "ENOENT") {
    console.error("audit-template: npm is not installed");
    process.exit(1);
  }
  const parsed = parseJsonObject(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);

  if (isAuditReport(parsed)) {
    const { high, critical, moderate = 0, low = 0, info = 0, total = 0 } =
      parsed.metadata.vulnerabilities;
    if (high + critical > 0) {
      console.error(
        `audit failed: ${high} high, ${critical} critical production ${high + critical === 1 ? "advisory" : "advisories"} in ${templateDir}`,
      );
      for (const entry of namedHighCritical(parsed)) {
        const via = Array.isArray(entry.via)
          ? [...new Set(
              entry.via
                .map((item) => (typeof item === "string" ? item : item?.title ?? item?.name))
                .filter(Boolean),
            )].join("; ")
          : "";
        console.error(`  ${entry.severity}\t${entry.name}${via ? ` — ${via}` : ""}`);
      }
      process.exit(1);
    }

    console.log(
      `audit passed: 0 high, 0 critical in ${templateDir} (${total} total; moderate=${moderate} low=${low} info=${info})`,
    );
    process.exit(0);
  }

  lastOutageReason = describeSpawnFailure(result);
  console.warn(
    `audit did not execute (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastOutageReason}`,
  );
  if (attempt < MAX_ATTEMPTS) sleep(RETRY_GAP_MS);
}

const eventLabel = eventName || "local";
if (failOnOutage) {
  console.error(
    `audit did not execute: npm audit endpoint unreachable after ${MAX_ATTEMPTS} attempts (${eventLabel}). ${lastOutageReason}`,
  );
  process.exit(1);
}

console.warn(
  `audit did not execute: npm audit endpoint unreachable after ${MAX_ATTEMPTS} attempts (${eventLabel}). Passing on pull_request/push so an outage is not treated as an advisory; scheduled Check will fail if the outage persists. ${lastOutageReason}`,
);
process.exit(0);
