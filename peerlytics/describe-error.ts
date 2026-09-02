/**
 * describe-error.ts
 *
 * Shared failure containment for the peerlytics/ examples.
 *
 * The SDK rethrows a non-JSON error body as the error message verbatim. When
 * the Peerlytics REST surface answers with the site's HTML 404 page — as
 * peerlytics.xyz/api/v1/* has been doing — every example that printed
 * `err.message` dumped a ~46KB document into the reader's terminal, once per
 * request. Strip any markup body, collapse whitespace, and cap the remainder so
 * the reason survives and the page does not.
 *
 * This mirrors describeUpstreamError in demo/server/peerlytics.ts. The demo is
 * a separate installable app, so the two copies stay in step by assertion in
 * scripts/validate-starters.mjs rather than by import.
 */

const MAX_ERROR_LENGTH = 200;
const FALLBACK_ERROR = "Unable to reach the Peerlytics API.";
const MARKUP_PATTERN = /<!doctype\s+html|<html[\s>]/i;

/**
 * True when the failure body was a web page rather than an API response.
 *
 * The SDK maps every HTTP 404 to NotFoundError, so a missing route and a
 * missing record arrive as the same class. A markup body is the tell: the
 * request reached the site, not the API, and no amount of fixing the address
 * or slug in the query will help.
 */
export function respondedWithMarkup(error: unknown): boolean {
  return error instanceof Error && MARKUP_PATTERN.test(error.message);
}

/** Turn whatever the SDK threw into one short line worth printing. */
export function describeUpstreamError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const markupAt = raw.search(MARKUP_PATTERN);
  const prose = (markupAt === -1 ? raw : raw.slice(0, markupAt)).replace(/\s+/g, " ").trim();

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
