import { Bot } from "grammy";
import {
  CURRENCIES,
  OFFRAMP_DEVELOPER_RESOURCES,
  PLATFORMS,
  createOfframp,
} from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAKER_PRIVATE_KEY = process.env.MAKER_PRIVATE_KEY as `0x${string}` | undefined;
const INTEGRATOR_ID = "__INTEGRATOR_ID__";
const REFERRAL_ID = "TODO_SET_REFERRAL_ID";

if (!BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}
if (!MAKER_PRIVATE_KEY) {
  throw new Error("Missing MAKER_PRIVATE_KEY");
}

const account = privateKeyToAccount(MAKER_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

const bot = new Bot(BOT_TOKEN);

function parseSellCommand(text: string): { amount: string; identifier: string } {
  const [, amountRaw, identifierRaw] = text.trim().split(/\s+/);
  const amount = amountRaw?.trim() ?? "";
  const identifier = identifierRaw?.trim() ?? "";

  if (!amount || !identifier) {
    throw new Error("Usage: /sell <amount> <identifier>");
  }

  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Amount must be a positive USDC number.");
  }

  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Amount must be a positive USDC number.");
  }

  return { amount, identifier };
}

bot.command("start", (ctx) => {
  void ctx.reply(
    "USDC offramp bot online. Use /sell <amount> <identifier>. Example: /sell 50 alice\n\nUse /resources for SDK docs, webhook docs, and the agent skill.",
  );
});

bot.command("resources", (ctx) => {
  const links = OFFRAMP_DEVELOPER_RESOURCES.links;
  void ctx.reply(
    [
      `${OFFRAMP_DEVELOPER_RESOURCES.packageName} v${OFFRAMP_DEVELOPER_RESOURCES.sdkVersion}`,
      `Chain: Base mainnet (${OFFRAMP_DEVELOPER_RESOURCES.chainId})`,
      `Delegation required: ${OFFRAMP_DEVELOPER_RESOURCES.delegation.required ? "yes" : "no"}`,
      "",
      `SDK guide: ${links.sdkGuide}`,
      `Bot guide: ${links.botGuide}`,
      `Webhooks: ${links.webhooksGuide}`,
      `Agent skill: ${links.agentSkill}`,
      `Peerlytics: ${links.peerlyticsDevelopers}`,
    ].join("\n"),
  );
});

bot.command("sell", async (ctx) => {
  try {
    const text = ctx.message?.text || "";
    const { amount, identifier } = parseSellCommand(text);

    const sdk = createOfframp({
      walletClient,
      integratorId: INTEGRATOR_ID,
      referralId: REFERRAL_ID,
    });

    const result = await sdk.createDeposit({
      amount,
      platform: PLATFORMS.REVOLUT,
      currency: CURRENCIES.USD,
      identifier,
      integratorId: INTEGRATOR_ID,
      referralId: REFERRAL_ID,
    });

    await ctx.reply(
      `Deposit created. ID: ${result.depositId}\nTx: https://basescan.org/tx/${result.txHash}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.reply(`Failed to create deposit: ${message}`);
  }
});

bot.start();
console.log("Telegram offramp bot started");
