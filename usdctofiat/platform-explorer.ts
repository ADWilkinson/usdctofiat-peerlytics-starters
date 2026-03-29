/**
 * platform-explorer.ts
 *
 * Displays all supported payment platforms, their currencies, and
 * identifier requirements. Useful for building deposit UIs.
 *
 * Usage:
 *   npx tsx usdctofiat/platform-explorer.ts
 *   npx tsx usdctofiat/platform-explorer.ts revolut     # single platform detail
 */

import { Offramp, type PlatformInfo, type Platform } from "@usdctofiat/offramp";

// ── Formatting ──────────────────────────────────────────────────────

const fmt = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  pad: (s: string, w: number) => {
    const vis = s.replace(/\x1b\[\d+m/g, "").length;
    return s + " ".repeat(Math.max(0, w - vis));
  },
};

// ── Main ────────────────────────────────────────────────────────────

function main() {
  const offramp = new Offramp();
  const platforms = offramp.getPlatforms();
  const filterPlatform = process.argv[2]?.toLowerCase();

  console.log();
  console.log(fmt.bold("  Supported Platforms"));
  console.log(fmt.dim(`  @usdctofiat/offramp · ${platforms.length} platforms`));
  console.log();

  if (filterPlatform) {
    const platform = platforms.find((p) => p.id === filterPlatform);
    if (!platform) {
      console.log(fmt.dim(`  Platform "${filterPlatform}" not found.`));
      console.log(fmt.dim(`  Available: ${platforms.map((p) => p.id).join(", ")}`));
      console.log();
      return;
    }
    printPlatformDetail(offramp, platform);
    return;
  }

  // Overview table
  for (const p of platforms) {
    const name = fmt.pad(fmt.bold(p.name), 20);
    const count = fmt.pad(fmt.cyan(`${p.currencies.length} currencies`), 22);
    const label = fmt.dim(p.identifierLabel);
    console.log(`  ${name} ${count} ${label}`);
  }

  console.log();
  console.log(fmt.dim("  Run with a platform name for detail: npx tsx usdctofiat/platform-explorer.ts revolut"));
  console.log();
}

function printPlatformDetail(offramp: Offramp, p: PlatformInfo) {
  console.log(`  ${fmt.bold(p.name)} ${fmt.dim(`(${p.id})`)}`);
  console.log();
  console.log(`  Identifier:   ${p.identifierLabel}`);
  console.log(`  Placeholder:  ${fmt.dim(p.identifierPlaceholder)}`);
  console.log(`  Help:         ${fmt.dim(p.helperText)}`);
  console.log();
  console.log(`  Currencies ${fmt.dim(`(${p.currencies.length})`)}:`);

  const cols = 6;
  for (let i = 0; i < p.currencies.length; i += cols) {
    const row = p.currencies.slice(i, i + cols).map((c) => fmt.pad(c, 6)).join("");
    console.log(`    ${row}`);
  }

  // Validation examples
  console.log();
  console.log(`  Validation:`);
  const examples = [
    { input: "alice", label: "plain" },
    { input: "@alice", label: "with @" },
    { input: "", label: "empty" },
  ];
  for (const ex of examples) {
    const result = offramp.validateIdentifier(p.id as Platform, ex.input);
    const icon = result.valid ? fmt.green("✓") : fmt.yellow("✗");
    const norm = result.valid ? fmt.dim(` → "${result.normalized}"`) : fmt.dim(` ${result.error}`);
    console.log(`    ${icon} "${ex.input}" ${fmt.dim(`(${ex.label})`)}${norm}`);
  }

  console.log();
}

main();
