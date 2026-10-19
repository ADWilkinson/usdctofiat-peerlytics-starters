import { setTimeout as sleep } from "node:timers/promises";

const TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
const USER_AGENT =
  "usdctofiat-peerlytics-starters-reachability/1.0 (+https://github.com/ADWilkinson/usdctofiat-peerlytics-starters)";

export async function probe(url, { fetchUrl = fetch, wait = sleep } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let result;
    try {
      const response = await fetchUrl(url, {
        redirect: "follow",
        headers: { "user-agent": USER_AGENT, accept: "*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      result = { url, status: response.status, error: null };
      // Only the status is needed; cleanup must not change the HTTP verdict.
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      const name = error instanceof Error ? error.name : "fetch_failed";
      result = { url, status: null, error: name };
    }

    const transient =
      result.status === null || result.status === 429 ||
      (result.status >= 500 && result.status <= 599);
    if (!transient || attempt === RETRY_DELAYS_MS.length) return result;

    const delay = RETRY_DELAYS_MS[attempt];
    console.warn(
      `retry\t${result.status ?? result.error}\t${url}\tattempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}; waiting ${delay}ms`,
    );
    await wait(delay);
  }
}
