#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type TemplateName = "next" | "vite" | "telegram-bot";

const TEMPLATE_NAMES: readonly TemplateName[] = ["next", "vite", "telegram-bot"];

interface CliOptions {
  targetDir: string;
  template: TemplateName;
}

function printUsage(): void {
  console.log(`create-offramp-app

Usage:
  npx create-offramp-app <directory> [--template=next|vite|telegram-bot] [--integratorId=<id>]

--integratorId=<id> is deprecated and ignored; the SDK applies fixed attribution.

Examples:
  npx create-offramp-app demo
  npx create-offramp-app demo --template=vite
`);
}

function parseTemplate(value: string): TemplateName | null {
  return TEMPLATE_NAMES.includes(value as TemplateName) ? (value as TemplateName) : null;
}

function parseArgs(argv: string[]): {
  targetDir: string | null;
  template: TemplateName;
  help: boolean;
} {
  let targetDir: string | null = null;
  let template: TemplateName = "next";
  let help = false;

  for (const rawArg of argv) {
    const arg = rawArg.trim();
    if (!arg) continue;
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg.startsWith("--template=")) {
      const next = parseTemplate(arg.slice("--template=".length));
      if (!next) {
        throw new Error(`Unsupported template: ${arg.slice("--template=".length)}`);
      }
      template = next;
      continue;
    }
    if (arg.startsWith("--integratorId=")) {
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (!targetDir) {
      targetDir = arg;
      continue;
    }
    throw new Error(`Unexpected positional argument: ${arg}`);
  }

  return { targetDir, template, help };
}

function ensureDirectoryIsEmpty(path: string): void {
  if (!existsSync(path)) return;
  const entries = readdirSync(path);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${path}`);
  }
}

function copyTemplateDirectory(
  sourceDir: string,
  targetDir: string,
) {
  const entries = readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const outputName = entry.name === "_gitignore" ? ".gitignore" : entry.name;
    const targetPath = join(targetDir, outputName);

    if (entry.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyTemplateDirectory(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile()) continue;

    copyFileSync(sourcePath, targetPath);
  }
}

function resolveOptions(argv: string[]): CliOptions | null {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    printUsage();
    return null;
  }

  if (!parsed.targetDir) {
    throw new Error("Missing required <directory> argument");
  }

  return {
    targetDir: parsed.targetDir,
    template: parsed.template,
  };
}

function logNextSteps(targetDir: string): void {
  console.log("\nScaffold complete. Next steps:");
  console.log(`  cd ${targetDir}`);
  console.log("  bun install");
  console.log("  bun run dev");
}

function main() {
  try {
    const options = resolveOptions(process.argv.slice(2));
    if (!options) return;

    const here = dirname(fileURLToPath(import.meta.url));
    const templateRoot = resolve(here, "..", "templates");
    const templateDir = join(templateRoot, options.template);
    if (!existsSync(templateDir)) {
      throw new Error(`Template not found: ${options.template}`);
    }

    const outputDir = resolve(process.cwd(), options.targetDir);
    mkdirSync(outputDir, { recursive: true });
    ensureDirectoryIsEmpty(outputDir);

    copyTemplateDirectory(templateDir, outputDir);

    console.log(`\nCreated ${options.template} app at ${outputDir}`);
    logNextSteps(options.targetDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`create-offramp-app failed: ${message}`);
    process.exit(1);
  }
}

main();
