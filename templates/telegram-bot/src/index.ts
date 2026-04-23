import { Bot } from "grammy";
import { CURRENCIES, PLATFORMS, createOfframp } from "@usdctofiat/offramp";
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

bot.command("start", (ctx) => {
  void ctx.reply(
    "USDC offramp bot online. Use /sell <amount> <identifier>. Example: /sell 50 alice",
  );
});

bot.command("sell", async (ctx) => {
  try {
    const text = ctx.message?.text || "";
    const [, amountRaw, identifierRaw] = text.trim().split(/\s+/);
    const amount = amountRaw || "10";
    const identifier = identifierRaw || "alice";

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
