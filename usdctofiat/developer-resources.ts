/**
 * developer-resources.ts
 *
 * Prints the canonical self-serve integration bundle exported by
 * @usdctofiat/offramp. Useful for coding agents, docs generators, and bots
 * that need the right SDK guide, agent skill, OTC guide, and Peerlytics
 * upgrade path without hardcoding URLs.
 *
 * Caveat as of 2026-09-02: the bundle is baked into the published package, and
 * most of the pages it names have since been taken down -- everything under
 * usdctofiat.xyz/developers, usdctofiat.xyz/skills, and peerlytics.xyz/developers
 * returns 404. Only llms.txt, llms-full.txt, the starters repo and the npm page
 * still resolve. This script marks each dead link so the list is not read as a
 * set of working destinations. See the README.
 *
 * Usage:
 *   npx tsx usdctofiat/developer-resources.ts
 *   npx tsx usdctofiat/developer-resources.ts bot
 */

import {
  OFFRAMP_DEVELOPER_RESOURCES,
  getOfframpDeveloperResources,
  type OfframpIntegratorProfile,
  type OfframpIntegrationPlaybook,
} from "@usdctofiat/offramp";

const profile = process.argv[2]?.trim().toLowerCase() as
  | OfframpIntegratorProfile
  | undefined;
const resource = getOfframpDeveloperResources(profile);
const validProfiles = OFFRAMP_DEVELOPER_RESOURCES.playbooks.map(
  (playbook) => playbook.profile,
);

// Prefix match, because the bundle ships both bare and trailing-slash forms and
// query-string variants of the same removed pages.
const DEAD_LINK_PREFIXES = [
  "https://usdctofiat.xyz/developers",
  "https://usdctofiat.xyz/skills/",
  "https://peerlytics.xyz/developers",
];

function isKnownDeadLink(href: string): boolean {
  return DEAD_LINK_PREFIXES.some((prefix) => href.startsWith(prefix));
}

function printLinks(links: ReadonlyArray<[string, string]>): void {
  let dead = 0;
  for (const [label, href] of links) {
    const isDead = isKnownDeadLink(href);
    if (isDead) dead += 1;
    console.log(`- ${label}: ${href}${isDead ? "   [404 as of 2026-09-02]" : ""}`);
  }
  if (dead === 0) return;
  console.log();
  console.log(`  ${dead} of these are baked into the published SDK and no longer resolve.`);
  console.log("  Use usdctofiat/llms.txt and peerlytics/llms.txt in this repo instead.");
}

function isPlaybook(value: typeof resource): value is OfframpIntegrationPlaybook {
  return "profile" in value;
}

function main() {
  console.log();

  if (isPlaybook(resource)) {
    console.log(`${resource.title} (${resource.profile})`);
    console.log(resource.summary);
    console.log();
    for (const [index, step] of resource.steps.entries()) {
      console.log(`${index + 1}. ${step.title}`);
      console.log(`   ${step.detail}`);
    }
    console.log();
    printLinks(resource.resources.map((link) => [link.label, link.href]));
    console.log();
    return;
  }

  console.log(`${resource.packageName} v${resource.sdkVersion}`);
  console.log(`Chain: ${resource.chain} (${resource.chainId})`);
  console.log(`Referrer: ${resource.referrer}`);
  console.log(`Delegation required: ${resource.delegation.required ? "yes" : "no"}`);
  console.log(`Delegate rate manager: ${resource.delegation.rateManagerId}`);
  console.log(`Manager fee bps: ${resource.delegation.feeRateBps}`);
  console.log();

  console.log("Links");
  printLinks(Object.entries(resource.links));
  console.log();

  console.log("Playbooks");
  for (const playbook of OFFRAMP_DEVELOPER_RESOURCES.playbooks) {
    console.log(`- ${playbook.profile}: ${playbook.title}`);
  }
  console.log();
}

if (profile && !validProfiles.includes(profile)) {
  console.error(
    `Unknown profile "${profile}". Available: ${validProfiles.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  main();
}
