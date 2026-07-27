/**
 * platform-explorer.ts
 *
 * Browse all supported platforms, currencies, and validation rules.
 * Pure data — no wallet or API key needed.
 *
 * Usage:
 *   npx tsx usdctofiat/platform-explorer.ts
 *   npx tsx usdctofiat/platform-explorer.ts REVOLUT
 */

import { PLATFORMS, CURRENCIES } from "@usdctofiat/offramp";

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

function main() {
  const all = Object.entries(PLATFORMS);
  const filterKey = process.argv[2]?.trim().toUpperCase();

  console.log();
  console.log(fmt.bold("  Supported Platforms"));
  console.log(fmt.dim(`  @usdctofiat/offramp · ${all.length} platforms · ${Object.keys(CURRENCIES).length} currencies`));
  console.log();

  if (filterKey) {
    const entry = (PLATFORMS as Record<string, (typeof all)[number][1]>)[filterKey];
    if (!entry) {
      console.log(fmt.dim(`  Key "${filterKey}" not found. Available: ${all.map(([k]) => k).join(", ")}`));
      console.log();
      process.exitCode = 1;
      return;
    }
    printDetail(filterKey, entry);
    return;
  }

  for (const [key, p] of all) {
    const name = fmt.pad(fmt.bold(p.name), 20);
    const count = fmt.pad(fmt.cyan(`${p.currencies.length} currencies`), 22);
    const label = fmt.dim(p.identifier.label);
    console.log(`  ${fmt.dim(key.padEnd(14))} ${name} ${count} ${label}`);
  }

  console.log();
  console.log(fmt.dim("  Detail: npx tsx usdctofiat/platform-explorer.ts REVOLUT"));
  console.log();
}

function printDetail(key: string, p: (typeof PLATFORMS)[keyof typeof PLATFORMS]) {
  console.log(`  ${fmt.bold(p.name)} ${fmt.dim(`(PLATFORMS.${key})`)}`);
  console.log();
  console.log(`  Identifier:   ${p.identifier.label}`);
  console.log(`  Placeholder:  ${fmt.dim(p.identifier.placeholder)}`);
  console.log(`  Help:         ${fmt.dim(p.identifier.help)}`);
  console.log();

  const cols = 6;
  console.log(`  Currencies ${fmt.dim(`(${p.currencies.length})`)}:`);
  for (let i = 0; i < p.currencies.length; i += cols) {
    const row = p.currencies.slice(i, i + cols).map((c) => {
      const info = (CURRENCIES as Record<string, { symbol: string }>)[c];
      return fmt.pad(`${c} ${fmt.dim(info?.symbol ?? "")}`, 10);
    }).join("");
    console.log(`    ${row}`);
  }

  console.log();
  console.log(`  Validation:`);
  for (const [input, label] of [["alice", "plain"], ["@alice", "with @"], ["", "empty"]] as const) {
    const result = p.validate(input);
    const icon = result.valid ? fmt.green("✓") : fmt.yellow("✗");
    const detail = result.valid ? fmt.dim(` → "${result.normalized}"`) : fmt.dim(` ${result.error}`);
    console.log(`    ${icon} "${input}" ${fmt.dim(`(${label})`)}${detail}`);
  }
  console.log();
}

main();
