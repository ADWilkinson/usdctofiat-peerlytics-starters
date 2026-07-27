import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const failures = [];
const require = createRequire(import.meta.url);
const {
  getPeerExtensionRegistrationInfo,
  PLATFORMS: offrampPlatforms,
} = require("@usdctofiat/offramp");

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
const rootReadme = readText("README.md");
const offrampLlms = readText("usdctofiat/llms.txt");
const rootOfframpVersion = dependencyVersion(rootPkg, "@usdctofiat/offramp");
const rootPeerlyticsVersion = dependencyVersion(rootPkg, "@peerlytics/sdk");
const rootZkp2pSdkOverride = rootPkg.overrides?.["@zkp2p/sdk"];
const offrampPlatformKeys = Object.keys(offrampPlatforms).join(", ");
const offrampPlatformNames = Object.values(offrampPlatforms)
  .map((platform) => platform.name)
  .join(", ");
const defaultStarterPlatform = offrampPlatforms.REVOLUT;

assert(
  rootReadme.includes(`Supported platforms: ${offrampPlatformNames}.`),
  "README.md must list the platforms exposed by the locked offramp SDK",
);
assert(
  offrampLlms.includes(`Keys: ${offrampPlatformKeys}`),
  "usdctofiat/llms.txt must list the platform keys exposed by the locked offramp SDK",
);
assert(
  Boolean(defaultStarterPlatform) &&
    defaultStarterPlatform.currencies.includes("USD") &&
    getPeerExtensionRegistrationInfo(defaultStarterPlatform.id) === null,
  "the locked offramp SDK must support the default starter route without Peer extension registration",
);

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
    [
      "@usdctofiat/offramp",
      "@base-org/account",
      "@x402/core",
      "@x402/evm",
      "@x402/svm",
      "ox",
    ],
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
          : Object.hasOwn(baseMiniAppTemplateDeps, name)
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
  "templates/next/.env.example": [
    "NEXT_PUBLIC_PRIVY_APP_ID",
    "NEXT_PUBLIC_INTEGRATOR_ID",
    "NEXT_PUBLIC_REFERRAL_ID",
  ],
  "templates/base-mini-app/.env.example": [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_BASE_BUILDER_CODE",
  ],
  "templates/vite/.env.example": [
    "VITE_PRIVY_APP_ID",
    "VITE_INTEGRATOR_ID",
    "VITE_REFERRAL_ID",
  ],
  "templates/telegram-bot/.env.example": [
    "TELEGRAM_BOT_TOKEN",
    "MAKER_PRIVATE_KEY",
    "AUTHORIZED_TELEGRAM_USER_ID",
    "INTEGRATOR_ID",
    "REFERRAL_ID",
  ],
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
const telegramBotPackage = readJson("templates/telegram-bot/package.json");
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

assert(
  telegramBotPackage.scripts?.dev === "tsx --env-file=.env src/index.ts",
  "templates/telegram-bot must load the documented .env file in local development",
);

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
const telegramSellHandler = telegramTemplate.slice(telegramTemplate.indexOf('bot.command("sell"'));
const executableRevolutExamples = [
  "usdctofiat/create-deposit.ts",
  "usdctofiat/resume-deposit.ts",
  "usdctofiat/otc-deposit.ts",
];
const otcDepositExample = readText("usdctofiat/otc-deposit.ts");
const createDepositExample = readText("usdctofiat/create-deposit.ts");
const closeDepositExample = readText("usdctofiat/close-deposit.ts");
const manageDepositsExample = readText("usdctofiat/manage-deposits.ts");

assert(
  nextTemplate.includes("setSubmitMessage"),
  "templates/next/app/page.tsx must surface submit success/failure to users",
);
assert(
  baseMiniAppTemplate.includes("createBaseAccountSDK") &&
    baseMiniAppTemplate.includes('method: "eth_requestAccounts"') &&
    !baseMiniAppTemplate.includes('provider.request({ method: "wallet_connect" })'),
  "templates/base-mini-app/app/mini-app-cashout.tsx must connect through Base Account's supported eth_requestAccounts path",
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
  readText("templates/base-mini-app/app/layout.tsx").includes("export const viewport"),
  "templates/base-mini-app/app/layout.tsx must set an explicit mobile viewport",
);
assert(
  readText("templates/next/app/layout.tsx").includes("export const viewport"),
  "templates/next/app/layout.tsx must set an explicit mobile viewport",
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
  baseMiniAppTemplate.includes('id: "revolut-usd"') &&
    baseMiniAppTemplate.includes('["id"]>("revolut-usd")'),
  "templates/base-mini-app/app/mini-app-cashout.tsx must default to the extension-free Revolut USD route",
);
assert(
  viteTemplate.includes("setSubmitMessage"),
  "templates/vite/src/App.tsx must surface submit success/failure to users",
);
for (const [file, text] of [
  ["templates/next/app/page.tsx", nextTemplate],
  ["templates/vite/src/App.tsx", viteTemplate],
]) {
  assert(
    text.includes("await wallet.switchChain(base.id)"),
    `${file} must switch the connected Privy wallet to Base before creating its wallet client`,
  );
  assert(
    text.includes("PLATFORMS.REVOLUT.validate") &&
      text.includes("platform: PLATFORMS.REVOLUT"),
    `${file} must default to a USD route that does not require Peer extension registration`,
  );
}
for (const [file, text] of [
  ["templates/next/app/page.tsx", nextTemplate],
  ["templates/base-mini-app/app/mini-app-cashout.tsx", baseMiniAppTemplate],
  ["templates/vite/src/App.tsx", viteTemplate],
]) {
  assert(
    text.includes("validate(identifier.trim())"),
    `${file} must validate the trimmed payment identifier it submits`,
  );
  assert(
    text.includes("amountValue >= 1"),
    `${file} must enforce the SDK's 1 USDC minimum before submission`,
  );
}
assert(
  !nextTemplate.includes('identifier: "alice"'),
  "templates/next/app/page.tsx must not hardcode a payment identifier",
);
assert(
  nextTemplate.includes("configuredReferralId") &&
    !nextTemplate.includes("referralId: REFERRAL_ID"),
  "templates/next/app/page.tsx must not send TODO_SET_REFERRAL_ID to the SDK",
);
assert(
  !nextTemplate.includes("style={{"),
  "templates/next/app/page.tsx must use reusable CSS classes instead of inline UI styling",
);
assert(
  !viteTemplate.includes('identifier: "alice"'),
  "templates/vite/src/App.tsx must not hardcode a payment identifier",
);
assert(
  viteTemplate.includes("configuredReferralId") &&
    !viteTemplate.includes("referralId: REFERRAL_ID"),
  "templates/vite/src/App.tsx must not send TODO_SET_REFERRAL_ID to the SDK",
);
assert(
  !viteTemplate.includes("style={{"),
  "templates/vite/src/App.tsx must use reusable CSS classes instead of inline UI styling",
);
assert(
  telegramTemplate.includes("Usage: /sell <amount> <identifier>"),
  "templates/telegram-bot/src/index.ts must reject incomplete /sell commands",
);
assert(
  telegramTemplate.includes("Missing or invalid AUTHORIZED_TELEGRAM_USER_ID") &&
    telegramSellHandler.indexOf("String(ctx.from?.id) !== AUTHORIZED_TELEGRAM_USER_ID") >= 0 &&
    telegramSellHandler.indexOf("String(ctx.from?.id) !== AUTHORIZED_TELEGRAM_USER_ID") <
      telegramSellHandler.indexOf("parseSellCommand(text)"),
  "templates/telegram-bot/src/index.ts must authorize /sell callers before parsing or wallet activity",
);
assert(
  !telegramTemplate.includes('identifierRaw || "alice"'),
  "templates/telegram-bot/src/index.ts must not silently default payment identifiers",
);
assert(
  telegramTemplate.includes("parsedAmount < 1") &&
    telegramTemplate.includes("Amount must be at least 1 USDC."),
  "templates/telegram-bot/src/index.ts must enforce the SDK's 1 USDC minimum",
);
assert(
  telegramTemplate.includes("const USDC_DECIMALS = 6;") &&
    telegramTemplate.includes("fractionalDigits > USDC_DECIMALS") &&
    telegramTemplate.includes("Amount supports at most ${USDC_DECIMALS} decimal places."),
  "templates/telegram-bot/src/index.ts must reject amounts that exceed USDC precision",
);
assert(
  readText("templates/telegram-bot/README.md").includes("at most six decimal places"),
  "templates/telegram-bot/README.md must document the USDC amount precision limit",
);
for (const file of executableRevolutExamples) {
  const text = readText(file);
  assert(
    text.includes("process.env.REVOLUT_REV_TAG") &&
      text.includes("PLATFORMS.REVOLUT.validate(REVOLUT_REV_TAG)") &&
      text.includes("identifier: revolutRevTag") &&
      !text.includes('identifier: "demo"'),
    `${file} must require and validate the operator's payout Revtag`,
  );
}
assert(
  createDepositExample.includes("parseUnits(amount, 6) < 1_000_000n") &&
    createDepositExample.includes("at most 6 decimal places"),
  "usdctofiat/create-deposit.ts must validate USDC amounts before wallet activity",
);
assert(
  otcDepositExample.includes('mode !== "one-call" && mode !== "retrofit"') &&
    !otcDepositExample.includes('as "one-call" | "retrofit"'),
  "usdctofiat/otc-deposit.ts must reject invalid MODE values instead of silently using retrofit",
);
assert(
  closeDepositExample.includes("!/^\\d+$/.test(depositId)") &&
    closeDepositExample.includes("non-negative decimal integer"),
  "usdctofiat/close-deposit.ts must reject deposit IDs that cannot be encoded as uints",
);
assert(
  closeDepositExample.includes("const MAX_UINT256 = (1n << 256n) - 1n") &&
    closeDepositExample.includes("BigInt(depositId) > MAX_UINT256"),
  "usdctofiat/close-deposit.ts must reject deposit IDs above the uint256 range",
);
assert(
  closeDepositExample.includes("process.argv[2]?.trim()"),
  "usdctofiat/close-deposit.ts must normalize pasted deposit IDs",
);
assert(
  manageDepositsExample.includes('import { isAddress } from "viem"') &&
    manageDepositsExample.includes("!isAddress(address)"),
  "usdctofiat/manage-deposits.ts must reject invalid addresses before querying the indexer",
);
assert(
  manageDepositsExample.includes(
    "(process.argv[2] ?? process.env.WALLET_ADDRESS)?.trim()",
  ),
  "usdctofiat/manage-deposits.ts must normalize pasted wallet addresses",
);
assert(
  telegramTemplate.includes("configuredReferralId") &&
    !telegramTemplate.includes("referralId: REFERRAL_ID"),
  "templates/telegram-bot/src/index.ts must not send TODO_SET_REFERRAL_ID to the SDK",
);
assert(
  telegramTemplate.includes("await bot.start({") &&
    telegramTemplate.includes("onStart: (botInfo)") &&
    !telegramTemplate.includes('console.log("Telegram offramp bot started")'),
  "templates/telegram-bot/src/index.ts must only report readiness after Telegram authentication",
);
assert(
  baseMiniAppTemplate.includes("validation?.valid ? validation.normalized : identifier.trim()"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must submit normalized payment identifiers",
);
assert(
  !baseMiniAppTemplate.includes("style={{"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must use reusable CSS classes instead of inline UI styling",
);

const demoServer = readText("demo/server/peerlytics.ts");
const demoApi = readText("demo/api/orderbook.ts");
const demoViteConfig = readText("demo/vite.config.ts");
const developerResources = readText("usdctofiat/developer-resources.ts");
const integratorReport = readText("peerlytics/integrator-report.ts");
const liveActivity = readText("peerlytics/live-activity.ts");
const makerReport = readText("peerlytics/maker-report.ts");
const orderbookSnapshot = readText("peerlytics/orderbook-snapshot.ts");
const platformExplorer = readText("usdctofiat/platform-explorer.ts");
const rateMonitor = readText("peerlytics/rate-monitor.ts");
const timeseriesChart = readText("peerlytics/timeseries-chart.ts");

assert(
  demoServer.includes("const supportedRoutes"),
  "demo/server/peerlytics.ts must own the supported route registry",
);
assert(
  !demoApi.includes("const supportedRoutes"),
  "demo/api/orderbook.ts must use the shared route registry instead of duplicating it",
);
assert(
  demoViteConfig.includes("loadEnv") &&
    demoViteConfig.includes("fileEnv.PEERLYTICS_API_KEY"),
  "demo/vite.config.ts must load the server-only Peerlytics key from Vite env files",
);
assert(
  demoViteConfig.includes('req.method !== "GET"'),
  "demo/vite.config.ts must match the production orderbook API method contract",
);
assert(
  developerResources.includes("getOfframpDeveloperResources") &&
    developerResources.includes("OFFRAMP_DEVELOPER_RESOURCES"),
  "usdctofiat/developer-resources.ts must demonstrate the SDK resource bundle",
);
assert(
  developerResources.includes("validProfiles.includes(profile)") &&
    developerResources.includes("process.exitCode = 1"),
  "usdctofiat/developer-resources.ts must reject unknown integration profiles",
);
assert(
  developerResources.includes("process.argv[2]?.trim().toLowerCase()"),
  "usdctofiat/developer-resources.ts must normalize human-entered profiles",
);
assert(
  integratorReport.includes("if (windowDays !== 90)") &&
    integratorReport.includes("the only currently materialized window"),
  "peerlytics/integrator-report.ts must reject unsupported report windows locally",
);
assert(
  integratorReport.includes("process.env.CODE?.trim()"),
  "peerlytics/integrator-report.ts must normalize copied integrator slugs",
);
assert(
  orderbookSnapshot.includes(
    "CURRENCIES.some((currency) => currency.length === 0)",
  ) &&
    orderbookSnapshot.includes("comma-separated list without empty entries"),
  "peerlytics/orderbook-snapshot.ts must reject empty currency queries",
);
assert(
  orderbookSnapshot.indexOf("process.exitCode = 1") >
    orderbookSnapshot.indexOf("} catch (err)"),
  "peerlytics/orderbook-snapshot.ts must exit nonzero after request failures",
);
assert(
  platformExplorer.includes('Key "${filterKey}" not found') &&
    platformExplorer.includes("process.exitCode = 1"),
  "usdctofiat/platform-explorer.ts must fail unknown platform lookups",
);
assert(
  platformExplorer.includes("process.argv[2]?.trim().toUpperCase()"),
  "usdctofiat/platform-explorer.ts must normalize padded platform keys",
);
assert(
  rateMonitor.includes("!Number.isFinite(POLL_SECONDS) || POLL_SECONDS < 1") &&
    rateMonitor.includes("Set POLL_SECONDS to a finite number of at least 1 second"),
  "peerlytics/rate-monitor.ts must reject polling intervals that can flood the API",
);
assert(
  rateMonitor.includes("!Number.isFinite(THRESHOLD) || THRESHOLD <= 0") &&
    rateMonitor.includes("Set THRESHOLD to a finite positive rate"),
  "peerlytics/rate-monitor.ts must reject thresholds that silently disable alerts",
);
assert(
  rateMonitor.includes('(process.env.CURRENCY ?? "GBP").trim()') &&
    rateMonitor.includes("Set CURRENCY to a non-empty fiat currency code"),
  "peerlytics/rate-monitor.ts must reject blank currency filters",
);
assert(
  liveActivity.includes("!Number.isFinite(POLL_SECONDS) || POLL_SECONDS < 1") &&
    liveActivity.includes("Set POLL_SECONDS to a finite number of at least 1 second"),
  "peerlytics/live-activity.ts must reject polling intervals that can flood the API",
);
assert(
  liveActivity.includes("Record<EventType") &&
    liveActivity.includes("!Object.hasOwn(EVENT_STYLES, EVENT_TYPE_INPUT)") &&
    liveActivity.indexOf("!Object.hasOwn(EVENT_STYLES, EVENT_TYPE_INPUT)") <
      liveActivity.indexOf("const client = new Peerlytics"),
  "peerlytics/live-activity.ts must reject invalid event types before polling",
);
assert(
  makerReport.includes('import { isAddress } from "viem"') &&
    makerReport.includes("!isAddress(address)") &&
    makerReport.indexOf("!isAddress(address)") <
      makerReport.indexOf("client.getMaker(address)"),
  "peerlytics/maker-report.ts must reject invalid addresses before API requests",
);
assert(
  timeseriesChart.includes("!validEntities.includes(entityInput as Entity)") &&
    timeseriesChart.includes(
      "!validGranularities.includes(granularityInput as Granularity)",
    ),
  "peerlytics/timeseries-chart.ts must reject invalid enums before calling the paid endpoint",
);
assert(
  timeseriesChart.includes('parseBoundary(fromRaw, "FROM")') &&
    timeseriesChart.includes('parseBoundary(toRaw, "TO")') &&
    timeseriesChart.includes("Number.isNaN(Date.parse(normalized))"),
  "peerlytics/timeseries-chart.ts must validate time boundaries before calling the paid endpoint",
);
assert(
  timeseriesChart.includes("boundaryMillis(from) >= boundaryMillis(to)") &&
    timeseriesChart.includes("Set FROM to a time before TO"),
  "peerlytics/timeseries-chart.ts must reject reversed or empty time windows",
);
assert(
  timeseriesChart.includes(
    "boundaryMillis(to) - boundaryMillis(from) > MAX_WINDOW_MILLIS",
  ) &&
    timeseriesChart.includes("window of at most 400 days"),
  "peerlytics/timeseries-chart.ts must enforce the SDK's 400-day window cap",
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
