import { LIVE_DOC_URLS } from "./documented-urls.mjs";

const TIMEOUT_MS = 15_000;
const USER_AGENT =
  "usdctofiat-peerlytics-starters-reachability/1.0 (+https://github.com/ADWilkinson/usdctofiat-peerlytics-starters)";

if (LIVE_DOC_URLS.length === 0) {
  console.error("LIVE_DOC_URLS is empty; the reachability check has nothing to probe.");
  process.exit(1);
}

async function probe(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { url, status: response.status, error: null };
  } catch (error) {
    const name = error instanceof Error ? error.name : "fetch_failed";
    return { url, status: null, error: name };
  }
}

const results = [];
for (const url of LIVE_DOC_URLS) {
  results.push(await probe(url));
}

const failures = results.filter((row) => row.status !== 200);
for (const row of results) {
  const mark = row.status === 200 ? "ok" : "FAIL";
  const detail = row.status ?? row.error;
  console.log(`${mark}\t${detail}\t${row.url}`);
}

if (failures.length > 0) {
  console.error(
    `Documented URL reachability failed: ${failures.length}/${results.length} URLs did not return 200.`,
  );
  process.exit(1);
}

console.log(`Documented URL reachability passed: ${results.length} URLs returned 200.`);
