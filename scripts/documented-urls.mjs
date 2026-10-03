/**
 * Reader-facing URLs this repo documents, split so a disappearance fails the
 * scheduled check instead of a cloner's app (#15 step 3).
 *
 * LIVE_DOC_URLS are fetched. Everything else that extractHttpsUrls finds in
 * documented files must be classified here or `npm run validate` fails, so a
 * new README link cannot skip the probe by accident.
 *
 * npm package pages, X, and shields.io are not fetched: npmjs returns 403 to
 * many clients (the scheduled `published` job already installs without a
 * lockfile), and the others are badges or social links rather than the product
 * contract.
 */

export const DEAD_DOC_URLS = [
  "https://peerlytics.xyz/developers",
  "https://peerlytics.xyz/llms.txt",
  "https://peerlytics.xyz/llms-full.txt",
  "https://peerlytics.xyz/api/openapi",
  "https://peerlytics.xyz/api-reference",
  "https://peerlytics.xyz/activity",
  "https://usdctofiat.xyz/developers",
  "https://usdctofiat.xyz/skills/",
  "https://galleonlabs.io/fleet",
  // The SDK monorepo is private; the link 404s for everyone but its owner.
  "https://github.com/ADWilkinson/galleonlabs-zkp2p",
];

export const LIVE_DOC_URLS = [
  "https://offramp-sdk.vercel.app",
  "https://usdctofiat.xyz",
  "https://usdctofiat.xyz/llms-full.txt",
  "https://usdctofiat.xyz/sell",
  "https://usdctofiat.xyz/usdc-to-fiat/",
  "https://usdctofiat.xyz/learn/base-usdc/",
  "https://peerlytics.xyz",
  "https://peerlytics.xyz/",
  "https://peerlytics.xyz/explorer",
  "https://peerlytics.xyz/connect",
  "https://galleonlabs.io/",
  "https://zkp2p.xyz",
  "https://github.com/ADWilkinson/usdctofiat-peerlytics-starters",
  "https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/issues/15",
  "https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/blob/main/usdctofiat/llms.txt",
  "https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/blob/main/peerlytics/llms.txt",
  "https://docs.base.org/apps/quickstart/build-app",
  "https://docs.base.org/apps/guides/migrate-to-standard-web-app",
  "https://docs.base.org/apps/growth/rewards",
  "https://docs.base.org/apps/builder-codes/app-developers",
];

export const UNPROBED_URLS = [];

export const UNPROBED_URL_PREFIXES = [
  "https://www.npmjs.com/",
  "https://x.com/",
  "https://img.shields.io/",
  "https://paypal.me/",
  "https://your-mini-app.example",
  "https://mainnet.base.org",
  "https://chromewebstore.google.com/",
];

export const DEAD_URL_MATCHER = "usdctofiat/developer-resources.ts";

export function extractHttpsUrls(text) {
  const urls = new Set();
  for (const match of text.matchAll(/https:\/\/[^\s<>"'`)\]}]+/g)) {
    urls.add(match[0].replace(/[.,;:]+$/, ""));
  }
  return urls;
}

export function isUnprobed(url) {
  return (
    UNPROBED_URLS.includes(url) ||
    UNPROBED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
  );
}

export function isDeadDocUrl(url) {
  return DEAD_DOC_URLS.some((dead) => url === dead || url.startsWith(dead));
}
