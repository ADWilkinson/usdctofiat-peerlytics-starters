import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "create-offramp-app-test-"));
const excluded = /^(node_modules|\.next|dist|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/;

function files(directory, source = false, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (source && (excluded.test(entry.name) || (entry.name.startsWith(".env") && entry.name !== ".env.example"))) return [];
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) {
      assert.notEqual(entry.name, "node_modules");
      return files(join(directory, entry.name), source, path);
    }
    assert(entry.isFile(), `Unexpected non-file: ${path}`);
    assert.notEqual(entry.name, "_gitignore");
    return [path];
  }).sort();
}

try {
  // Packing runs prepack and builds the CLI; no scaffold dependencies are installed.
  execFileSync("npm", ["pack", "--pack-destination", temp], { cwd: root, stdio: "pipe", timeout: 120_000 });
  const archives = readdirSync(temp).filter((name) => name.endsWith(".tgz"));
  assert.equal(archives.length, 1);
  execFileSync("tar", ["-xzf", join(temp, archives[0]), "-C", temp]);
  const cli = join(temp, "package", "dist", "index.js");
  assert(readFileSync(cli, "utf8").startsWith("#!/usr/bin/env node\n"));
  assert.deepEqual(readdirSync(join(temp, "package", "templates")).sort(), ["next", "telegram-bot", "vite"]);

  for (const template of ["next", "vite", "telegram-bot"]) {
    const output = join(temp, template);
    const args = template === "next" ? [] : [`--template=${template}`];
    if (template === "vite") args.push("--integratorId=legacy-id");
    const log = execFileSync(process.execPath, [cli, output, ...args], {
      cwd: temp, input: "", encoding: "utf8", timeout: 10_000,
    });
    assert(!log.includes("Integrator ID"));
    const source = join(root, "..", "templates", template);
    const actual = files(output);
    assert(actual.includes(".gitignore"));
    assert.deepEqual(actual, files(source, true));
    for (const file of actual) {
      assert.deepEqual(readFileSync(join(output, file)), readFileSync(join(source, file)), `${template}/${file}`);
    }
    if (template === "next") {
      const version = JSON.parse(readFileSync(join(output, "package.json"))).dependencies.next;
      assert.equal(version, JSON.parse(readFileSync(join(source, "package.json"))).dependencies.next);
      assert.match(version, /^\d+\.\d+\.\d+$/);
      const [major, minor, patch] = version.split(".").map(Number);
      assert(major > 16 || (major === 16 && (minor > 3 || (minor === 3 && patch >= 8))));
    }
    console.log(`PASS ${template}: ${actual.length} files match repo template byte-for-byte`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
