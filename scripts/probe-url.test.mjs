import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { LIVE_DOC_URLS } from "./documented-urls.mjs";
import { probe } from "./probe-url.mjs";

const url = "https://example.com/docs";

async function replay(t, outcomes) {
  const waits = [];
  const requests = [];
  let cancelled = 0;
  const warnings = t.mock.method(console, "warn", () => {});
  const result = await probe(url, {
    fetchUrl: async (requestedUrl, options) => {
      assert.equal(requestedUrl, url);
      requests.push(options);
      assert(requests.length <= outcomes.length, "unexpected extra request");
      const outcome = outcomes[requests.length - 1];
      if (outcome instanceof Error) throw outcome;
      return { status: outcome, body: { cancel: async () => { cancelled += 1; } } };
    },
    wait: async (delay) => { waits.push(delay); },
  });
  assert.equal(requests.length, outcomes.length);
  assert.equal(cancelled, outcomes.filter((outcome) => typeof outcome === "number").length);
  assert.equal(warnings.mock.callCount(), waits.length);
  for (const request of requests) {
    assert.equal(request.redirect, "follow");
    assert.equal(request.headers.accept, "*/*");
    assert.match(request.headers["user-agent"], /starters-reachability/);
    assert(request.signal instanceof AbortSignal);
  }
  assert.equal(new Set(requests.map((request) => request.signal)).size, requests.length);
  return { result, waits };
}

test("200 succeeds without retrying", async (t) => {
  const { result, waits } = await replay(t, [200]);
  assert.deepEqual(result, { url, status: 200, error: null });
  assert.deepEqual(waits, []);
});

test("body cleanup errors do not retry a permanent HTTP failure", async () => {
  let attempts = 0;
  const result = await probe(url, {
    fetchUrl: async () => {
      attempts += 1;
      return { status: 404, body: { cancel: async () => { throw new Error("stream closed"); } } };
    },
    wait: async () => { assert.fail("404 must not retry"); },
  });
  assert.equal(result.status, 404);
  assert.equal(attempts, 1);
});

for (const transient of [500, 502, 503, 504, 599, 429, new TypeError("fetch failed"), new DOMException("timed out", "TimeoutError")]) {
  const label = transient instanceof Error ? transient.name : transient;
  test(`${label} recovers on a later 200`, async (t) => {
    const { result, waits } = await replay(t, [transient, 200]);
    assert.equal(result.status, 200);
    assert.equal(result.error, null);
    assert.deepEqual(waits, [1_000]);
  });

  test(`persistent ${label} fails after four attempts`, async (t) => {
    const { result, waits } = await replay(t, Array(4).fill(transient));
    assert.equal(result.status, transient instanceof Error ? null : transient);
    assert.equal(result.error, transient instanceof Error ? transient.name : null);
    assert.deepEqual(waits, [1_000, 2_000, 4_000]);
  });
}

test("all 4xx except 429 fail immediately", async (t) => {
  for (let status = 400; status < 500; status += 1) {
    if (status === 429) continue;
    const { result, waits } = await replay(t, [status]);
    assert.equal(result.status, status);
    assert.deepEqual(waits, []);
  }
});

test("other non-200 statuses are not retried or accepted", async (t) => {
  for (const status of [201, 204, 301, 302, 304]) {
    const { result, waits } = await replay(t, [status]);
    assert.equal(result.status, status);
    assert.deepEqual(waits, []);
  }
});

test("a permanent failure stops retries after a transient failure", async (t) => {
  const { result, waits } = await replay(t, [503, 404]);
  assert.equal(result.status, 404);
  assert.deepEqual(waits, [1_000]);
});

test("mixed transient failures can recover on the final attempt", async (t) => {
  const { result, waits } = await replay(t, [503, new TypeError("fetch failed"), 429, 200]);
  assert.equal(result.status, 200);
  assert.deepEqual(waits, [1_000, 2_000, 4_000]);
});

for (const [name, outcomes, exitCode] of [
  ["recovered 503", [503, 200], 0],
  ["persistent 503", [503, 503, 503, 503], 1],
  ["permanent 404", [404], 1],
]) {
  test(`CLI checks every URL and returns ${exitCode} for ${name}`, () => {
    const script = `
      const outcomes = ${JSON.stringify(outcomes)};
      const target = ${JSON.stringify(LIVE_DOC_URLS[0])};
      globalThis.fetch = async (url) => new Response(null, {
        status: url === target ? outcomes.shift() : 200,
      });
      await import(${JSON.stringify(new URL("./probe-documented-urls.mjs", import.meta.url).href)});
    `;
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8", timeout: 20_000,
    });
    assert.ifError(child.error);
    assert.equal(child.status, exitCode, child.stderr);
    const rows = child.stdout.split("\n").filter((line) => /^(ok|FAIL)\t/.test(line));
    assert.deepEqual(rows.map((line) => line.split("\t")[2]), LIVE_DOC_URLS);
    if (exitCode === 0) {
      assert.match(child.stdout, /reachability passed: 20 URLs returned 200/);
    } else {
      assert.match(child.stderr, /reachability failed: 1\/20 URLs did not return 200/);
      assert.equal(rows.filter((line) => line.startsWith("FAIL\t")).length, 1);
    }
  });
}
