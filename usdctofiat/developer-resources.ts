/**
 * developer-resources.ts
 *
 * Prints the canonical self-serve integration bundle exported by
 * @usdctofiat/offramp. Useful for coding agents, docs generators, and bots
 * that need the right SDK guide, agent skill, webhook guide, and Peerlytics
 * upgrade path without hardcoding URLs.
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

const profile = process.argv[2] as OfframpIntegratorProfile | undefined;
const resource = getOfframpDeveloperResources(profile);

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
    for (const link of resource.resources) {
      console.log(`- ${link.label}: ${link.href}`);
    }
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
  for (const [label, href] of Object.entries(resource.links)) {
    console.log(`- ${label}: ${href}`);
  }
  console.log();

  console.log("Playbooks");
  for (const playbook of OFFRAMP_DEVELOPER_RESOURCES.playbooks) {
    console.log(`- ${playbook.profile}: ${playbook.title}`);
  }
  console.log();
}

main();
