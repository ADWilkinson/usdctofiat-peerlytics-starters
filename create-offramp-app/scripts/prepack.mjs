import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set([
  "node_modules", ".next", "dist", "package-lock.json", "npm-shrinkwrap.json",
  "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb",
]);

function copy(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (excluded.has(entry.name) || (entry.name.startsWith(".env") && entry.name !== ".env.example")) continue;
    const from = join(source, entry.name);
    const to = join(target, entry.name === ".gitignore" ? "_gitignore" : entry.name);
    if (entry.isDirectory()) copy(from, to);
    else if (entry.isFile()) copyFileSync(from, to);
  }
}

execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
rmSync(join(root, "templates"), { recursive: true, force: true });
for (const template of ["next", "vite", "telegram-bot"]) {
  copy(join(root, "..", "templates", template), join(root, "templates", template));
}
