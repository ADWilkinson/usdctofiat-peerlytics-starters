import { Bot } from "grammy";
import { OFFRAMP_DEVELOPER_RESOURCES, PLATFORMS, cashout } from "@usdctofiat/offramp";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAKER_PRIVATE_KEY = process.env.MAKER_PRIVATE_KEY as `0x${string}` | undefined;
const AUTHORIZED_TELEGRAM_USER_ID = process.env.AUTHORIZED_TELEGRAM_USER_ID?.trim() || "";
const USDC_DECIMALS = 6;

if (!BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}
if (!MAKER_PRIVATE_KEY) {
  throw new Error("Missing MAKER_PRIVATE_KEY");
}
if (!/^\d+$/.test(AUTHORIZED_TELEGRAM_USER_ID)) {
  throw new Error("Missing or invalid AUTHORIZED_TELEGRAM_USER_ID");
}

const account = privateKeyToAccount(MAKER_PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

const bot = new Bot(BOT_TOKEN);

function parseSellCommand(text: string): { amount: string; payee: string } {
  const [, amountRaw, payeeRaw] = text.trim().split(/\s+/);
  const amount = amountRaw?.trim() ?? "";
  const payee = payeeRaw?.trim() ?? "";

  if (!amount || !payee) {
    throw new Error("Usage: /sell <amount> <payee>");
  }

  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Amount must be a positive USDC number.");
  }

  const fractionalDigits = amount.split(".")[1]?.length ?? 0;
  if (fractionalDigits > USDC_DECIMALS) {
    throw new Error(`Amount supports at most ${USDC_DECIMALS} decimal places.`);
  }

  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
    throw new Error("Amount must be at least 1 USDC.");
  }

  return { amount, payee };
}

bot.command("start", (ctx) => {
  void ctx.reply(
    "USDC offramp bot online. Use /sell <amount> <payee>. Example: /sell 50 alice\n\nUse /resources for the SDK reference and starters.",
  );
});

// Same caveat as the web templates: the bundle still advertises the removed
// developer portal, so reply with the keys that still resolve.
bot.command("resources", (ctx) => {
  const links = OFFRAMP_DEVELOPER_RESOURCES.links;
  void ctx.reply(
    [
      `${OFFRAMP_DEVELOPER_RESOURCES.packageName} v${OFFRAMP_DEVELOPER_RESOURCES.sdkVersion}`,
      `Chain: Base mainnet (${OFFRAMP_DEVELOPER_RESOURCES.chainId})`,
      `Delegation required: ${OFFRAMP_DEVELOPER_RESOURCES.delegation.required ? "yes" : "no"}`,
      "",
      `SDK reference: ${links.fullMachineReference}`,
      `Starters: ${links.starters}`,
      `npm: ${links.npm}`,
    ].join("\n"),
  );
});

bot.command("sell", async (ctx) => {
  if (String(ctx.from?.id) !== AUTHORIZED_TELEGRAM_USER_ID) {
    await ctx.reply("You are not authorized to create deposits.");
    return;
  }

  try {
    const text = ctx.message?.text || "";
    const { amount, payee } = parseSellCommand(text);
    const payeeValidation = PLATFORMS.REVOLUT.validate(payee);
    if (!payeeValidation.valid) {
      throw new Error(payeeValidation.error);
    }

    const result = await cashout({
      mode: "best",
      signer: walletClient,
      amount,
      platform: "revolut",
      currency: "USD",
      payee: payeeValidation.normalized,
    });

    await ctx.reply(
      `Deposit created. ID: ${result.depositId}\nTx: https://basescan.org/tx/${result.txHash}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.reply(`Failed to create deposit: ${message}`);
  }
});

await bot.start({
  onStart: (botInfo) => {
    console.log(`Telegram offramp bot started as @${botInfo.username}`);
  },
});
