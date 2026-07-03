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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function listFiles(relativeDir, excludedNames = new Set()) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (excludedNames.has(entry.name)) continue;
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(relativePath, excludedNames));
    } else if (entry.isFile()) {
      out.push(relativePath);
    }
  }
  return out;
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
const rootZkp2pSdkOverride = rootPkg.overrides?.["@zkp2p/sdk"];

// The @solana-program/* and @solana/kit pins are intentional, not dead weight:
// @privy-io/react-auth statically imports them in its ESM bundle (e.g.
// FundSolWalletWithExternalSolanaWallet, useSolanaRpcClient). They are optional
// peer deps at install time, but next build / vite build fail with
// module-not-found if they are absent. Keep them pinned in next + vite.
const packageChecks = [
  ["demo/package.json", ["@peerlytics/sdk", "@usdctofiat/offramp"]],
  [
    "templates/next/package.json",
    [
      "@usdctofiat/offramp",
      "@privy-io/react-auth",
      "@solana-program/system",
      "@solana-program/token",
      "@solana/kit",
    ],
  ],
  [
    "templates/base-mini-app/package.json",
    ["@usdctofiat/offramp", "@base-org/account", "ox"],
  ],
  [
    "templates/vite/package.json",
    [
      "@usdctofiat/offramp",
      "@privy-io/react-auth",
      "@solana-program/system",
      "@solana-program/token",
      "@solana/kit",
    ],
  ],
  ["templates/telegram-bot/package.json", ["@usdctofiat/offramp"]],
];

const privyTemplateDeps = readJson("templates/next/package.json").dependencies;
const baseMiniAppTemplateDeps = readJson("templates/base-mini-app/package.json").dependencies;
const baseMiniAppPackage = readJson("templates/base-mini-app/package.json");

for (const [pkgPath, names] of packageChecks) {
  const pkg = readJson(pkgPath);
  for (const name of names) {
    const expected =
      name === "@peerlytics/sdk"
        ? rootPeerlyticsVersion
        : name === "@usdctofiat/offramp"
          ? rootOfframpVersion
          : name === "@base-org/account" || name === "ox"
            ? baseMiniAppTemplateDeps[name]
          : privyTemplateDeps[name];
    assert(
      dependencyVersion(pkg, name) === expected,
      `${pkgPath} must keep ${name} at ${expected}`,
    );
  }

  assert(
    pkg.overrides?.["@zkp2p/sdk"] === rootZkp2pSdkOverride,
    `${pkgPath} must keep @zkp2p/sdk override at ${rootZkp2pSdkOverride}`,
  );
}

const envFiles = {
  "demo/.env.example": ["PEERLYTICS_API_KEY"],
  "templates/next/.env.example": ["NEXT_PUBLIC_PRIVY_APP_ID"],
  "templates/base-mini-app/.env.example": [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_BASE_BUILDER_CODE",
  ],
  "templates/vite/.env.example": ["VITE_PRIVY_APP_ID"],
  "templates/telegram-bot/.env.example": ["TELEGRAM_BOT_TOKEN", "MAKER_PRIVATE_KEY"],
};

for (const [file, keys] of Object.entries(envFiles)) {
  const text = readText(file);
  for (const key of keys) {
    assert(text.includes(`${key}=`), `${file} must document ${key}`);
  }
}

const baseMiniAppAuthoredFiles = listFiles(
  "templates/base-mini-app",
  new Set([".next", ".vercel", "node_modules"]),
);
const forbiddenBaseMiniAppTerms = [
  "@far" + "caster/",
  ".well-known/far" + "caster",
  "fc:frame",
  "frame-sdk",
  "miniapp-sdk",
  "neynar",
];

for (const [depName] of Object.entries({
  ...(baseMiniAppPackage.dependencies ?? {}),
  ...(baseMiniAppPackage.devDependencies ?? {}),
})) {
  const normalized = depName.toLowerCase();
  for (const term of forbiddenBaseMiniAppTerms) {
    assert(
      !normalized.includes(term),
      `templates/base-mini-app/package.json must not depend on ${depName}`,
    );
  }
}

for (const file of baseMiniAppAuthoredFiles) {
  const text = readText(file).toLowerCase();
  for (const term of forbiddenBaseMiniAppTerms) {
    assert(!text.includes(term), `${file} must stay on the standard Base web app path`);
  }
}

const templateEntrypoints = [
  "templates/next/app/page.tsx",
  "templates/base-mini-app/app/mini-app-cashout.tsx",
  "templates/vite/src/App.tsx",
  "templates/telegram-bot/src/index.ts",
];

const baseMiniAppPublicRoutes = [
  "templates/base-mini-app/app/icon.png/route.tsx",
  "templates/base-mini-app/app/opengraph-image.tsx",
];

for (const file of baseMiniAppPublicRoutes) {
  assert(exists(file), `templates/base-mini-app must provide ${file}`);
}

for (const file of templateEntrypoints) {
  const text = readText(file);
  assert(text.includes("__INTEGRATOR_ID__"), `${file} must keep the CLI integrator placeholder`);
  assert(text.includes("TODO_SET_REFERRAL_ID"), `${file} must keep the referral placeholder visible`);
  assert(
    text.includes("OFFRAMP_DEVELOPER_RESOURCES"),
    `${file} must expose OFFRAMP_DEVELOPER_RESOURCES so generated apps keep canonical docs and agent links`,
  );
}

const templateReadmes = [
  ["templates/next/README.md", "NEXT_PUBLIC_PRIVY_APP_ID"],
  ["templates/base-mini-app/README.md", "NEXT_PUBLIC_APP_URL"],
  ["templates/vite/README.md", "VITE_PRIVY_APP_ID"],
  ["templates/telegram-bot/README.md", "TELEGRAM_BOT_TOKEN"],
];

for (const [file, envKey] of templateReadmes) {
  assert(exists(file), `${file} must exist`);
  if (!exists(file)) continue;

  const text = readText(file);
  assert(text.includes("## Run"), `${file} must document local run steps`);
  assert(text.includes("## Customize"), `${file} must document customization points`);
  assert(text.includes("## Deploy"), `${file} must document deploy notes`);
  assert(text.includes(envKey), `${file} must document ${envKey}`);
  assert(text.includes("__INTEGRATOR_ID__"), `${file} must mention the integrator placeholder`);
  assert(text.includes("TODO_SET_REFERRAL_ID"), `${file} must mention the referral placeholder`);
}

const nextTemplate = readText("templates/next/app/page.tsx");
const baseMiniAppTemplate = readText("templates/base-mini-app/app/mini-app-cashout.tsx");
const viteTemplate = readText("templates/vite/src/App.tsx");
const telegramTemplate = readText("templates/telegram-bot/src/index.ts");

assert(
  nextTemplate.includes("setSubmitMessage"),
  "templates/next/app/page.tsx must surface submit success/failure to users",
);
assert(
  baseMiniAppTemplate.includes("createBaseAccountSDK") &&
    baseMiniAppTemplate.includes("wallet_connect"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must use Base Account instead of a generic wallet selector",
);
assert(
  baseMiniAppTemplate.includes("Attribution.toDataSuffix") &&
    baseMiniAppTemplate.includes("dataSuffix"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must attach the issued Base Builder Code through dataSuffix",
);
assert(
  baseMiniAppTemplate.includes("bc_srxybeyl"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must default to the issued USDCtoFiat Base Builder Code",
);
assert(
  baseMiniAppTemplate.includes("/icon.png"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must expose a public app icon to Base Account",
);
assert(
  !exists("templates/base-mini-app/app/.well-known/" + "far" + "caster.json/route.ts"),
  "templates/base-mini-app must not include unsupported social-mini-app wiring",
);
assert(
  readText("templates/base-mini-app/README.md").includes(
    "https://docs.base.org/apps/guides/migrate-to-standard-web-app",
  ),
  "templates/base-mini-app/README.md must cite the current standard Base web app path",
);
assert(
  readText("templates/base-mini-app/app/layout.tsx").includes("metadataBase"),
  "templates/base-mini-app/app/layout.tsx must set metadataBase for public discovery images",
);
assert(
  readText("templates/base-mini-app/app/page.tsx").includes("openGraph"),
  "templates/base-mini-app/app/page.tsx must keep Open Graph metadata for Base.dev discovery",
);
assert(
  baseMiniAppTemplate.includes("setSubmitMessage"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must surface submit success/failure to users",
);
assert(
  viteTemplate.includes("setSubmitMessage"),
  "templates/vite/src/App.tsx must surface submit success/failure to users",
);
assert(
  !nextTemplate.includes('identifier: "alice"'),
  "templates/next/app/page.tsx must not hardcode a payment identifier",
);
assert(
  !viteTemplate.includes('identifier: "alice"'),
  "templates/vite/src/App.tsx must not hardcode a payment identifier",
);
assert(
  telegramTemplate.includes("Usage: /sell <amount> <identifier>"),
  "templates/telegram-bot/src/index.ts must reject incomplete /sell commands",
);
assert(
  !telegramTemplate.includes('identifierRaw || "alice"'),
  "templates/telegram-bot/src/index.ts must not silently default payment identifiers",
);

const demoServer = readText("demo/server/peerlytics.ts");
const demoApi = readText("demo/api/orderbook.ts");
const developerResources = readText("usdctofiat/developer-resources.ts");

assert(
  demoServer.includes("const supportedRoutes"),
  "demo/server/peerlytics.ts must own the supported route registry",
);
assert(
  !demoApi.includes("const supportedRoutes"),
  "demo/api/orderbook.ts must use the shared route registry instead of duplicating it",
);
assert(
  developerResources.includes("getOfframpDeveloperResources") &&
    developerResources.includes("OFFRAMP_DEVELOPER_RESOURCES"),
  "usdctofiat/developer-resources.ts must demonstrate the SDK resource bundle",
);

const installClaudeScript = readText("demo/scripts/install-claude.sh");
assert(
  installClaudeScript.includes("${SCRIPT_DIR}/../..") &&
    installClaudeScript.includes("pwd)/skills/claude"),
  "demo/scripts/install-claude.sh must install skills from the repo-level skills/claude directory",
);

const nextGitignore = readText("templates/next/.gitignore");
assert(
  nextGitignore.includes("next-env.d.ts"),
  "templates/next/.gitignore must ignore Next's generated next-env.d.ts",
);

if (failures.length > 0) {
  console.error("Starter validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Starter validation passed.");
