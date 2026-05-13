import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function dependencyVersion(pkg, name) {
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? null;
}

const rootPkg = readJson("package.json");
const rootOfframpVersion = dependencyVersion(rootPkg, "@usdctofiat/offramp");
const rootPeerlyticsVersion = dependencyVersion(rootPkg, "@peerlytics/sdk");

const packageChecks = [
  ["demo/package.json", ["@peerlytics/sdk", "@usdctofiat/offramp"]],
  ["templates/next/package.json", ["@usdctofiat/offramp"]],
  ["templates/vite/package.json", ["@usdctofiat/offramp"]],
  ["templates/telegram-bot/package.json", ["@usdctofiat/offramp"]],
];

for (const [pkgPath, names] of packageChecks) {
  const pkg = readJson(pkgPath);
  for (const name of names) {
    const expected = name === "@peerlytics/sdk" ? rootPeerlyticsVersion : rootOfframpVersion;
    assert(
      dependencyVersion(pkg, name) === expected,
      `${pkgPath} must keep ${name} at ${expected}`,
    );
  }
}

const envFiles = {
  "demo/.env.example": ["PEERLYTICS_API_KEY"],
  "templates/next/.env.example": ["NEXT_PUBLIC_PRIVY_APP_ID"],
  "templates/vite/.env.example": ["VITE_PRIVY_APP_ID"],
  "templates/telegram-bot/.env.example": ["TELEGRAM_BOT_TOKEN", "MAKER_PRIVATE_KEY"],
};

for (const [file, keys] of Object.entries(envFiles)) {
  const text = readText(file);
  for (const key of keys) {
    assert(text.includes(`${key}=`), `${file} must document ${key}`);
  }
}

const templateEntrypoints = [
  "templates/next/app/page.tsx",
  "templates/vite/src/App.tsx",
  "templates/telegram-bot/src/index.ts",
];

for (const file of templateEntrypoints) {
  const text = readText(file);
  assert(text.includes("__INTEGRATOR_ID__"), `${file} must keep the CLI integrator placeholder`);
  assert(text.includes("TODO_SET_REFERRAL_ID"), `${file} must keep the referral placeholder visible`);
}

const demoServer = readText("demo/server/peerlytics.ts");
const demoApi = readText("demo/api/orderbook.ts");

assert(
  demoServer.includes("const supportedRoutes"),
  "demo/server/peerlytics.ts must own the supported route registry",
);
assert(
  !demoApi.includes("const supportedRoutes"),
  "demo/api/orderbook.ts must use the shared route registry instead of duplicating it",
);

if (failures.length > 0) {
  console.error("Starter validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Starter validation passed.");
