# Templates

Scaffolds for `@usdctofiat/offramp`. Each template is a working app with the wallet flow wired and a real `offramp()` call in place — drop in your `integratorId` and run.

## Use the CLI

```bash
npx create-offramp-app@latest my-offramp --template=next
```

The CLI prompts for your `integratorId` and substitutes it into the template files. Templates: `next`, `vite`, `telegram-bot`. Default is `next`.

## Templates

| Template | Stack | Best for |
|---|---|---|
| [`next`](./next) | Next.js 16 App Router + Privy | Production web apps with embedded wallet auth |
| [`vite`](./vite) | Vite + React 19 + viem | Lean SPA without Next conventions |
| [`telegram-bot`](./telegram-bot) | Node 22 + grammy + viem | Server-side maker bots with a managed wallet |

## What ships in each template

- `package.json` pinned to the latest `@usdctofiat/offramp` v4.x
- A working `offramp()` call wired to `PLATFORMS.VENMO` / `CURRENCIES.USD` — edit to taste
- Your `integratorId` baked in via the CLI prompt
- A `TODO_SET_REFERRAL_ID` placeholder for partner attribution — replace before shipping
- Type-checked TypeScript
- `OFFRAMP_DEVELOPER_RESOURCES` exposed in-app so generated projects keep canonical SDK, webhook, agent, and Peerlytics links
- A README inside the template covering run, deploy, and customize

## What surface these templates use

The `next` and `vite` templates call the standalone `offramp(walletClient, params)`
function; `telegram-bot` uses `createOfframp({ walletClient }).createDeposit(params)`
for a server-managed maker wallet. None of them touch the React hooks or the
low-level `peerExtensionSdk` — so SDK upgrades that only change those surfaces
need no template edits.

## Upgrading to v4.x

The template-level `offramp()` / `createOfframp()` flow is unchanged on v4 — just
raise the version. v4 only affects direct `peerExtensionSdk` drivers: the
`onramp()`, `getOnrampTransaction()`, and `openSidebar()` methods were removed in
favour of the `@zkp2p/sdk@0.5.0` `authenticate()` + `onMetadataMessage()` bridge.
See the [SDK CHANGELOG](https://github.com/ADWilkinson/galleonlabs-zkp2p/blob/main/packages/offramp-sdk/CHANGELOG.md).

PayPal + Wise makers still register their handle through the Peer browser
extension before the first deposit; in React that is driven by
`usePeerExtensionRegistration`. PayPal uses the `paypal.me` username, not email.

## Manual install (no CLI)

Copy a template directory into your project, replace `__INTEGRATOR_ID__` with your integrator ID, and `npm install`.

## See also

- SDK guide: [usdctofiat.xyz/developers/offramp-sdk](https://usdctofiat.xyz/developers/offramp-sdk/)
- App guide: [usdctofiat.xyz/developers/apps](https://usdctofiat.xyz/developers/apps/)
- Bot guide: [usdctofiat.xyz/developers/bots](https://usdctofiat.xyz/developers/bots/)
- Webhook contract: [usdctofiat.xyz/developers/webhooks](https://usdctofiat.xyz/developers/webhooks/)
- One-shot scripts that don't need scaffolding: [`/usdctofiat`](../usdctofiat) at the repo root
