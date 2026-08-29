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
const peerlyticsLlms = readText("peerlytics/llms.txt");
const peerlyticsSkillText = readText("skills/claude/query-peerlytics-data/SKILL.md");
const rootZkp2pSdkOverride = rootPkg.overrides?.["@zkp2p/sdk"];
const offrampPlatformKeys = Object.keys(offrampPlatforms).join(", ");
const offrampPlatformNames = Object.values(offrampPlatforms)
  .map((platform) => platform.name)
  .join(", ");
const defaultStarterPlatform = offrampPlatforms.REVOLUT;

assert(
  /^\^9\./.test(rootOfframpVersion ?? ""),
  "package.json must depend on @usdctofiat/offramp v9.x",
);
assert(
  /^\^4\./.test(rootPeerlyticsVersion ?? ""),
  "package.json must depend on @peerlytics/sdk v4.x",
);

// SDK 3 removed lockScore in favour of cancelledVolumeUsd. The starters teach
// agents as much as they teach people, so a doc that still offers the dead field
// as a returned value is a defect, not a stale sentence. Naming it in backticks
// to explain the removal is fine; the prose form was how it was taught as live.
for (const [file, text] of [
  ["peerlytics/llms.txt", peerlyticsLlms],
  ["query-peerlytics-data skill", peerlyticsSkillText],
]) {
  assert(
    !/lock score/i.test(text) && text.includes("cancelledVolumeUsd"),
    `${file} must teach cancelledVolumeUsd instead of the lock score removed in @peerlytics/sdk v3`,
  );
}

// SDK 4 retired the Peer/Plus/Pro wallet classification and every raw whitelist
// or group-policy projection. Same reasoning as the lock score above: these docs
// are the agent-facing contract, so naming a removed field as a returned value
// teaches a call that now yields undefined. Only the derived access and
// protection projections survive.
const removedInV4 = [
  ["tierSource", /tierSource/],
  ["verifiedGroups", /verifiedGroups/],
  ["groupMemberships", /groupMemberships/],
  ["filters.applied.takerGroupIds", /takerGroupIds/],
  ["trust.whitelistEntries", /whitelistEntries/],
  ["AddressStats.whitelistedDepositsTotal", /whitelistedDepositsTotal/],
  ["disputeProtectionOptedIn", /disputeProtectionOptedIn\b/],
  ["AddressGroupMemberships", /AddressGroupMemberships/],
  ["TakerGroupMemberships", /TakerGroupMemberships/],
  ["VerifiedPeerGroup", /VerifiedPeerGroup/],
];

// llms.txt keeps a migration section whose whole job is to name dead fields, so
// check the teaching prose around it rather than the file as a whole. Same
// carve-out the lock score check makes for a backticked removal note.
const llmsMigration = peerlyticsLlms.indexOf("## Moving off an older major");
const llmsAfterMigration = peerlyticsLlms.indexOf("## Optional filters");
assert(
  llmsMigration !== -1 && llmsAfterMigration > llmsMigration,
  "peerlytics/llms.txt must keep a migration section ahead of the filter notes",
);
const peerlyticsLlmsTeaching =
  peerlyticsLlms.slice(0, llmsMigration) + peerlyticsLlms.slice(llmsAfterMigration);

for (const [file, text] of [
  ["README.md", rootReadme],
  ["peerlytics/llms.txt", peerlyticsLlmsTeaching],
  ["query-peerlytics-data skill", peerlyticsSkillText],
]) {
  for (const [field, pattern] of removedInV4) {
    assert(
      !pattern.test(text),
      `${file} must not teach \`${field}\`, removed in @peerlytics/sdk v4`,
    );
  }
}

// The replacement projections are what agents should reach for instead.
for (const [file, text] of [
  ["peerlytics/llms.txt", peerlyticsLlms],
  ["query-peerlytics-data skill", peerlyticsSkillText],
]) {
  assert(
    text.includes("disputeProtectionOptedOut") &&
      text.includes("disputeProtectionRequiresStake"),
    `${file} must teach the v4 disputeProtectionOptedOut/disputeProtectionRequiresStake pair`,
  );
  assert(
    text.includes("takerAccess") && text.includes("paymentMethodsByDeposit"),
    `${file} must teach takerAccess.paymentMethodsByDeposit as the v4 replacement for group provenance`,
  );
}

// v4 dropped the client-side missing_filter guard: getDeposits()/getIntents()
// accept an empty filter set and return a bounded page instead of throwing.
for (const [file, text] of [
  ["README.md", rootReadme],
  ["peerlytics/llms.txt", peerlyticsLlms],
  ["query-peerlytics-data skill", peerlyticsSkillText],
]) {
  assert(
    !/missing_filter/.test(text),
    `${file} must not teach the missing_filter guard removed in @peerlytics/sdk v4`,
  );
}

const readmeQuickstart = rootReadme.slice(
  rootReadme.indexOf("## 60-second"),
  rootReadme.indexOf("Need a fresh app skeleton"),
);
const skillText = readText("skills/claude/integrate-usdctofiat-offramp/SKILL.md");
const skillGoldenPath = skillText.slice(0, skillText.indexOf("## Keep managed v5 flows explicit"));
const llmsGoldenPath = offrampLlms.slice(0, offrampLlms.indexOf("## Managed v5 compatibility"));

for (const [file, text] of [
  ["README.md 60-second path", readmeQuickstart],
  ["usdctofiat/llms.txt golden path", llmsGoldenPath],
  ["integrate-usdctofiat-offramp skill primary path", skillGoldenPath],
]) {
  assert(
    text.includes("cashout({") &&
      text.includes('mode: "') &&
      text.includes("signer") &&
      text.includes("payee:") &&
      !text.includes("await offramp("),
    `${file} must teach cashout({ mode, signer, payee }) before managed compatibility APIs`,
  );
}

assert(
  rootReadme.includes(`Supported platforms: ${offrampPlatformNames}.`),
  "README.md must list the platforms exposed by the locked offramp SDK",
);
assert(
  rootReadme.includes(
    "live-activity.ts             near-real-time protocol activity polling feed",
  ) && !rootReadme.includes("live-activity.ts             real-time protocol event stream (SSE)"),
  "README.md must describe live-activity.ts as polling rather than SSE",
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
  "templates/next/.env.example": ["NEXT_PUBLIC_PRIVY_APP_ID"],
  "templates/base-mini-app/.env.example": [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_BASE_BUILDER_CODE",
  ],
  "templates/vite/.env.example": ["VITE_PRIVY_APP_ID"],
  "templates/telegram-bot/.env.example": [
    "TELEGRAM_BOT_TOKEN",
    "MAKER_PRIVATE_KEY",
    "AUTHORIZED_TELEGRAM_USER_ID",
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

const templateNames = ["next", "base-mini-app", "vite", "telegram-bot"];

assert(exists(".github/workflows/check.yml"), "GitHub Actions must run the starter check");
if (exists(".github/workflows/check.yml")) {
  const checkWorkflow = readText(".github/workflows/check.yml");
  assert(
    checkWorkflow.includes("pull_request:") &&
      checkWorkflow.includes("push:") &&
      checkWorkflow.includes("npm ci") &&
      checkWorkflow.includes("npm run check"),
    ".github/workflows/check.yml must run npm run check on pull requests and pushes",
  );
  // This validator only reads the templates and demo as text. Their real
  // contract is that they still build against the versions a user resolves, so
  // the workflow has to compile them too or the drift lands in someone's app.
  assert(
    checkWorkflow.includes("working-directory: demo"),
    ".github/workflows/check.yml must build the demo app",
  );
  for (const template of templateNames) {
    assert(
      checkWorkflow.includes(`- ${template}\n`),
      `.github/workflows/check.yml must build the ${template} template`,
    );
  }
  assert(
    checkWorkflow.includes("working-directory: templates/${{ matrix.template }}"),
    ".github/workflows/check.yml must run the template matrix against each template directory",
  );
}

// Every scaffold has to be buildable by the workflow above, and a user who runs
// that build then commits their new app must not pick up its artifacts.
for (const template of templateNames) {
  const pkg = readJson(`templates/${template}/package.json`);
  assert(
    Boolean(pkg.scripts?.build),
    `templates/${template}/package.json must expose a build script for CI to run`,
  );
  assert(
    readText(`templates/${template}/.gitignore`)
      .split("\n")
      .includes("*.tsbuildinfo"),
    `templates/${template}/.gitignore must ignore TypeScript build info`,
  );
}

for (const file of baseMiniAppPublicRoutes) {
  assert(exists(file), `templates/base-mini-app must provide ${file}`);
}

for (const file of templateEntrypoints) {
  const text = readText(file);
  assert(
    text.includes("cashout({") &&
      text.includes('mode: "best"') &&
      text.includes("signer:") &&
      text.includes("payee:") &&
      !text.includes("await offramp(") &&
      !text.includes(".createDeposit("),
    `${file} must use cashout({ mode: "best", signer, payee }) as its default path`,
  );
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
}

const nextTemplate = readText("templates/next/app/page.tsx");
const baseMiniAppTemplate = readText("templates/base-mini-app/app/mini-app-cashout.tsx");
const viteTemplate = readText("templates/vite/src/App.tsx");
const telegramTemplate = readText("templates/telegram-bot/src/index.ts");
const telegramSellHandler = telegramTemplate.slice(telegramTemplate.indexOf('bot.command("sell"'));
const executableManagedRevolutExamples = [
  "usdctofiat/resume-deposit.ts",
  "usdctofiat/otc-deposit.ts",
];
const otcDepositExample = readText("usdctofiat/otc-deposit.ts");
const createDepositExample = readText("usdctofiat/create-deposit.ts");
const paypalDepositExample = readText("usdctofiat/paypal-deposit.ts");
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
      text.includes('platform: "revolut"') &&
      text.includes('currency: "USD"'),
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
  !nextTemplate.includes("style={{"),
  "templates/next/app/page.tsx must use reusable CSS classes instead of inline UI styling",
);
assert(
  !viteTemplate.includes('identifier: "alice"'),
  "templates/vite/src/App.tsx must not hardcode a payment identifier",
);
assert(
  !viteTemplate.includes("style={{"),
  "templates/vite/src/App.tsx must use reusable CSS classes instead of inline UI styling",
);
assert(
  telegramTemplate.includes("Usage: /sell <amount> <payee>"),
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
  !telegramTemplate.includes('payeeRaw || "alice"'),
  "templates/telegram-bot/src/index.ts must not silently default payment handles",
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
for (const file of executableManagedRevolutExamples) {
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
  createDepositExample.includes("cashout({") &&
    createDepositExample.includes('mode: "best"') &&
    createDepositExample.includes("signer: walletClient") &&
    createDepositExample.includes("payee: revolutRevTag") &&
    !createDepositExample.includes("await offramp("),
  "usdctofiat/create-deposit.ts must use the v8 best-mode cashout path",
);
assert(
  createDepositExample.includes("parseUnits(amount, 6) < 1_000_000n") &&
    createDepositExample.includes("at most 6 decimal places"),
  "usdctofiat/create-deposit.ts must validate USDC amounts before wallet activity",
);
assert(
  otcDepositExample.includes("parseUnits(amount, 6) < 1_000_000n") &&
    otcDepositExample.includes("at most 6 decimal places"),
  "usdctofiat/otc-deposit.ts must validate USDC amounts before wallet activity",
);
assert(
  paypalDepositExample.includes("parseUnits(amount, 6) < 1_000_000n") &&
    paypalDepositExample.includes("at most 6 decimal places"),
  "usdctofiat/paypal-deposit.ts must validate USDC amounts before wallet activity",
);
// offramp 9 rejects `otcTaker` on fresh creation: the protocol cannot create a
// deposit paused and private atomically, so a one-call private order would open
// a public window between creation and restriction. The starter must teach the
// supported order — create, confirm, then restrict — and must not hand `otcTaker`
// to a fresh cash-out, which now fails UNSUPPORTED at runtime.
assert(
  !/otcTaker:/.test(otcDepositExample) &&
    otcDepositExample.includes("await enableOtc(walletClient, result.depositId, taker)"),
  "usdctofiat/otc-deposit.ts must restrict a confirmed deposit with enableOtc() instead of passing otcTaker to fresh creation",
);
assert(
  otcDepositExample.includes("disableOtc(walletClient, result.depositId, {})"),
  "usdctofiat/otc-deposit.ts must pass the options argument disableOtc() requires in offramp 9",
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
  telegramTemplate.includes("await bot.start({") &&
    telegramTemplate.includes("onStart: (botInfo)") &&
    !telegramTemplate.includes('console.log("Telegram offramp bot started")'),
  "templates/telegram-bot/src/index.ts must only report readiness after Telegram authentication",
);
assert(
  baseMiniAppTemplate.includes(
    "payee: validation?.valid ? validation.normalized : identifier.trim()",
  ),
  "templates/base-mini-app/app/mini-app-cashout.tsx must submit normalized payment identifiers",
);
assert(
  !baseMiniAppTemplate.includes("style={{"),
  "templates/base-mini-app/app/mini-app-cashout.tsx must use reusable CSS classes instead of inline UI styling",
);

const demoServer = readText("demo/server/peerlytics.ts");
const demoApi = readText("demo/api/orderbook.ts");
const demoApp = readText("demo/src/App.tsx");
const demoWallet = readText("demo/src/lib/wallet.ts");
const demoViteConfig = readText("demo/vite.config.ts");
const developerResources = readText("usdctofiat/developer-resources.ts");
const integratorReport = readText("peerlytics/integrator-report.ts");
const liveActivity = readText("peerlytics/live-activity.ts");
const makerReport = readText("peerlytics/maker-report.ts");
const orderbookSnapshot = readText("peerlytics/orderbook-snapshot.ts");
const platformExplorer = readText("usdctofiat/platform-explorer.ts");
const rateMonitor = readText("peerlytics/rate-monitor.ts");
const timeseriesChart = readText("peerlytics/timeseries-chart.ts");

const demoSnippet = demoApp.slice(
  demoApp.indexOf("const USDCTOFIAT_SNIPPET"),
  demoApp.indexOf("// === App ==="),
);
assert(
  demoSnippet.includes("cashout({") &&
    demoSnippet.includes('mode: "best"') &&
    demoSnippet.includes("signer: walletClient") &&
    demoSnippet.includes("payee:") &&
    !demoSnippet.includes("offramp(walletClient"),
  "demo copy-paste snippet must teach the v8 cashout contract",
);
assert(
  demoApp.includes("managed EscrowV2 React hook as an explicit compatibility demo"),
  "demo must label its retained useOfframp flow as managed compatibility",
);

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
  demoApp.includes("orderbook: cachedState?.orderbook ?? null") &&
    demoApp.includes("updatedAt: cachedState?.updatedAt ?? null"),
  "demo/src/App.tsx must clear stale orderbook data when a selected route has no cache",
);
assert(
  demoApp.includes(
    "try {\n    const rawValue = window.sessionStorage.getItem(cacheKey)",
  ) &&
    demoApp.includes(
      "try {\n    window.sessionStorage.setItem(cacheKey, JSON.stringify(value))",
    ),
  "demo/src/App.tsx must treat unavailable session storage as an optional cache",
);
assert(
  demoApp.includes(
    "try {\n      await navigator.clipboard.writeText(value);\n      return;\n    } catch {",
  ) &&
    demoApp.indexOf('document.createElement("textarea")') >
      demoApp.indexOf("await navigator.clipboard.writeText(value)"),
  "demo/src/App.tsx must fall back when the modern clipboard API rejects",
);
assert(
  demoApp.includes('role={tone === "error" ? "alert" : "status"}'),
  "demo/src/App.tsx must announce asynchronous feedback to assistive technology",
);
assert(
  fs.readFileSync("demo/api/orderbook.ts", "utf8").includes('from "../server/peerlytics.js"'),
  "demo/api/orderbook.ts must use an ESM-resolvable local import in Vercel functions",
);
assert(
  demoWallet.match(/method: "wallet_switchEthereumChain"/g)?.length === 2 &&
    demoWallet.indexOf('method: "wallet_addEthereumChain"') <
      demoWallet.lastIndexOf('method: "wallet_switchEthereumChain"'),
  "demo/src/lib/wallet.ts must switch to Base after adding the missing chain",
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
  rateMonitor.includes("async function monitorRates(): Promise<void>") &&
    rateMonitor.includes(
      "await new Promise<void>((resolve) => setTimeout(resolve, POLL_SECONDS * 1000))",
    ) &&
    rateMonitor.includes("await monitorRates()") &&
    !rateMonitor.includes("setInterval(async () =>"),
  "peerlytics/rate-monitor.ts must wait for each rate check before scheduling the next",
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
  liveActivity.includes("const MAX_SEEN_EVENTS = 1_000") &&
    liveActivity.includes("if (seen.size > MAX_SEEN_EVENTS)") &&
    liveActivity.includes("seen.delete(oldestKey)") &&
    liveActivity.includes("if (rememberEvent(key))"),
  "peerlytics/live-activity.ts must bound its in-memory event deduplication history",
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
