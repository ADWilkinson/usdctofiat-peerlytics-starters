# Peerlytics & USDCtoFiat Starters

Wallet-native USDC off-ramp starters with **@usdctofiat/offramp**, plus links to Galleon's public Peer protocol activity and receipt explorer.

[![npm: @usdctofiat/offramp](https://img.shields.io/npm/v/@usdctofiat/offramp?label=%40usdctofiat%2Fofframp&color=6e4a0e)](https://www.npmjs.com/package/@usdctofiat/offramp)

**Live demo:** [offramp-sdk.vercel.app](https://offramp-sdk.vercel.app)
**Machine reference:** [usdctofiat.xyz/llms-full.txt](https://usdctofiat.xyz/llms-full.txt)
**Workshop:** [galleonlabs.io](https://galleonlabs.io/)

## Peerlytics

[Peerlytics](https://peerlytics.xyz/) is Galleon's public, read-only view of Peer protocol activity on Base. Watch deposits, intents, fills, and delegation in the live activity feed, or use the [explorer](https://peerlytics.xyz/explorer) to inspect receipts by intent, deposit, address, or transaction.

The [connect page](https://peerlytics.xyz/connect) adds the same public activity and receipts to compatible AI assistants. It does not connect a wallet, sign transactions, move funds, or provide a cash-out flow. Use the USDCtoFiat starters below for wallet-native off-ramping.

## 60-second cash-out

```ts
import { cashout } from "@usdctofiat/offramp";

const { depositId, txHash } = await cashout({
  mode: "fast",
  signer: walletClient,
  amount: "100",
  platform: "revolut",
  currency: "EUR",
  payee: "alice",
});
```

That call creates a direct Peer Cash order on Base at the live oracle rate. Choose `mode: "best"` instead to delegate pricing to the managed rate manager. Settlement runs on Revolut, Venmo, Wise, Cash App, Zelle, Monzo, or PayPal — your users never leave your app. Persist `depositId` immediately so the order can be resumed from another process or device.

Need a fresh app skeleton instead of dropping into an existing one?

```bash
npx create-offramp-app@latest my-offramp --template=next         # next | vite | telegram-bot
```

The published CLI accepts those three names. Copy [`templates/base-mini-app`](templates/base-mini-app) from this repo for a Base Account surface — `create-offramp-app --template=base-mini-app` fails.

**Agent skills (Claude Code, Cursor):** [`integrate-usdctofiat-offramp`](skills/claude/integrate-usdctofiat-offramp/SKILL.md). For other assistants, hand them the canonical `llms-full.txt`: [usdctofiat.xyz/llms-full.txt](https://usdctofiat.xyz/llms-full.txt).

## What's in this repo

```text
demo/                        Vite + React demo app (deployed to Vercel)
  src/App.tsx                  single-page UI: create deposits and withdraw

usdctofiat/                  @usdctofiat/offramp examples
  create-deposit.ts            cash out USDC in managed best mode
  close-deposit.ts             withdraw remaining USDC and close a deposit
  resume-deposit.ts            resume an interrupted deposit flow
  otc-deposit.ts               create an OTC deposit restricted to a single taker
  manage-deposits.ts           list and inspect deposits for a wallet
  platform-explorer.ts         enumerate platforms, currencies, and validation
  paypal-deposit.ts            PayPal flow — paypal.me username + Peer extension fallback
  react-example.tsx            useOfframp hook usage in React (Revolut)
  paypal-react-example.tsx     useOfframp + usePeerExtensionRegistration handshake
  developer-resources.ts       print SDK links, delegation config, and app/bot/agent playbooks
  llms.txt                     LLM-friendly SDK reference

templates/                   Scaffold-ready integrations (CLI: next, vite, telegram-bot)
  next/                        Next.js 16 App Router + Privy
  base-mini-app/               Next.js 16 + Base Account compact cash-out app (copy from this repo)
  vite/                        Vite + React 19 + viem
  telegram-bot/                Node 22 + grammy + viem (server-side maker bot)
  README.md                    template selection + v1/v2 upgrade notes

skills/                      Claude Code skills for AI-assisted development
  claude/
    integrate-usdctofiat-offramp/  skill: integrate the offramp SDK
```

## Run the examples

Each script under `usdctofiat/` runs standalone:

```bash
# USDCtoFiat (wallet-side, needs a private key for tx examples)
npx tsx usdctofiat/platform-explorer.ts
```

The deposit scripts default to the public Base RPC. Set `RPC_URL` to a private
endpoint (Alchemy, QuickNode, etc.) to avoid rate limits on real deposit runs.

## Run the demo locally

```bash
cd demo
npm install
npm run dev
```

Deploy to Vercel:

```bash
cd demo
vercel link                                # link to your Vercel project
vercel --prod
```

## Start a real app

Choose the smallest starter that matches where the cash-out flow will live:

| Starter | Use it when | Required env |
|---|---|---|
| `next` | You want a production web app with Privy wallet auth | `NEXT_PUBLIC_PRIVY_APP_ID` |
| `base-mini-app` | You are distributing a compact Base Account cash-out surface | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_BUILDER_CODE` |
| `vite` | You want a lean SPA without Next.js conventions | `VITE_PRIVY_APP_ID` |
| `telegram-bot` | You are running a server-side maker bot with a managed wallet | `TELEGRAM_BOT_TOKEN`, `MAKER_PRIVATE_KEY`, `AUTHORIZED_TELEGRAM_USER_ID` |

`npx create-offramp-app` scaffolds `next`, `vite`, and `telegram-bot`. Copy `templates/base-mini-app` when you need the Base Account surface.

The v9 flat `cashout()` helper applies the package's fixed USDCtoFiat attribution automatically; it does not need an integrator or referral environment variable.

## @usdctofiat/offramp

Non-custodial USDC-to-fiat cash-out on Base. Revolut, Venmo, Wise, PayPal, Cash App, Zelle, Monzo, and more.

```ts
import { cashout } from "@usdctofiat/offramp";

const order = await cashout({
  mode: "best",
  signer: walletClient,
  amount: "100",
  platform: "revolut",
  currency: "USD",
  payee: "alice",
});
```

Use `mode: "fast"` for the direct 0 bps oracle-spread route or `mode: "best"` for the Delegate-managed route. Pass `disabledPlatforms` to drop a rail from discovery and reject it before any new deposit — Cash App ships disabled by default in `OFFRAMP_DISABLED_PAYMENT_PLATFORMS`. The legacy managed EscrowV2 helpers remain available as an explicit compatibility surface; see `usdctofiat/otc-deposit.ts` and the package's managed-v5 migration guide.

For a private order, create the deposit first and restrict it once it confirms with `enableOtc(walletClient, depositId, takerAddress)`. offramp 9 rejects `otcTaker` on fresh creation with `UNSUPPORTED`, because the protocol cannot yet create a deposit paused and private atomically; the option survives only to recover an exact existing undelegated deposit. Newly created deposits carry the protocol's 1,500 USDC default per-order cap.

**PayPal, Wise, Venmo, and Cash App** makers may need to register their handle in the PeerAuth browser extension before the first deposit. The SDK throws `EXTENSION_REGISTRATION_REQUIRED` and ships `usePeerExtensionRegistration(platform)` to drive the install / connect / verify flow. See `usdctofiat/paypal-react-example.tsx` and `usdctofiat/paypal-deposit.ts` for the PayPal-shaped recovery pattern. PayPal uses the `paypal.me` **username**, not the account email.

Supported platforms: Venmo, Cash App, Chime, Revolut, Wise, Mercado Pago, Zelle, PayPal, Monzo.

[npm](https://www.npmjs.com/package/@usdctofiat/offramp) · [llms.txt](usdctofiat/llms.txt) (in this repo) · [llms-full.txt](https://usdctofiat.xyz/llms-full.txt) · [Sell USDC](https://usdctofiat.xyz/sell).

The SDK also exports the canonical self-serve resource bundle, so apps, bots, CLIs, and coding agents do not need to hardcode docs URLs. Note that the bundle is baked into the published package and most of the pages it names have since been taken down — `npx tsx usdctofiat/developer-resources.ts` flags each dead link:

```ts
import { OFFRAMP_DEVELOPER_RESOURCES, getOfframpDeveloperResources } from "@usdctofiat/offramp";

console.log(OFFRAMP_DEVELOPER_RESOURCES.links.fullMachineReference);
console.log(getOfframpDeveloperResources("bot"));
```

Run `npx tsx usdctofiat/developer-resources.ts` or `npx tsx usdctofiat/developer-resources.ts agent` to print the full map.

## Links

- [usdctofiat.xyz/llms-full.txt](https://usdctofiat.xyz/llms-full.txt) — canonical machine reference, and the developer hub's live replacement
- [usdctofiat.xyz/sell](https://usdctofiat.xyz/sell) — the product the SDK drives
- [How USDC to fiat works](https://usdctofiat.xyz/usdc-to-fiat/) — what your users get: methods, currencies, fees
- [Base USDC](https://usdctofiat.xyz/learn/base-usdc/) — the exact token the off-ramp sells (native, not USDbC)
- [Peerlytics activity](https://peerlytics.xyz/) — live Peer protocol activity on Base
- [Peerlytics Explorer](https://peerlytics.xyz/explorer) — read-only intent, deposit, address, and transaction receipts
- [Connect Peerlytics](https://peerlytics.xyz/connect) — public activity and receipts in compatible AI assistants
- [ZKP2P Protocol](https://zkp2p.xyz)
- [@andrewwilkinson](https://x.com/andrewwilkinson)

## License

[MIT](LICENSE)
