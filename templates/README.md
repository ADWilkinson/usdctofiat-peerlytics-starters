# Templates

Scaffolds for `@usdctofiat/offramp`. Each template is a working app with the wallet flow wired and an explicit `cashout({ mode })` call in place.

## Use the CLI

```bash
npx create-offramp-app@latest my-offramp --template=next
```

CLI templates: `next`, `vite`, `telegram-bot`. Default is `next`.
Copy [`base-mini-app`](./base-mini-app) from this repo for a Base Account surface — the published `create-offramp-app` CLI does not accept that name.

## Templates

| Template | Stack | Best for |
|---|---|---|
| [`next`](./next) | Next.js 16 App Router + Privy | Production web apps with embedded wallet auth |
| [`base-mini-app`](./base-mini-app) | Next.js 16 + Base Account | Compact Base app surfaces and distribution experiments |
| [`vite`](./vite) | Vite + React 19 + viem | Lean SPA without Next conventions |
| [`telegram-bot`](./telegram-bot) | Node 22 + grammy + viem | Server-side maker bots with a managed wallet |

## What ships in each template

- `package.json` pinned to `@usdctofiat/offramp` v9.x
- A working `cashout({ mode: "best" })` path wired to Revolut / USD — edit to taste
- Fixed USDCtoFiat attribution applied by the v9 SDK
- Type-checked TypeScript
- `OFFRAMP_DEVELOPER_RESOURCES` exposed in-app so generated projects keep canonical SDK, OTC, agent, and Peerlytics links
- A README inside the template covering run, deploy, and customize

## What surface these templates use

All four templates call the standalone `cashout({ mode, signer, amount,
currency, platform, payee })` helper. They default to `best` mode to preserve
Delegate-managed pricing while using the v9 production API. None of them touch
the React hooks or low-level extension client.

## Upgrading from v5

Replace the managed `offramp(walletClient, { identifier })` path with
`cashout({ mode, signer: walletClient, payee })`. Choose `fast` for the direct
Peer Cash route or `best` for Delegate-managed pricing. The old managed API is
still available as an explicit compatibility surface under
`@usdctofiat/offramp/managed`. See the [SDK CHANGELOG](https://github.com/ADWilkinson/galleonlabs-zkp2p/blob/main/packages/offramp-sdk/CHANGELOG.md).

PayPal, Wise, Venmo, and Cash App makers may need to register their handle
through the PeerAuth browser extension before the first deposit; in React that
is driven by `usePeerExtensionRegistration`. PayPal uses the `paypal.me`
username, not email.

## Manual install (no CLI)

Copy a template directory into your project and run `npm install`.

## See also

- SDK guide: [usdctofiat.xyz/developers/offramp-sdk](https://usdctofiat.xyz/developers/offramp-sdk/)
- App guide: [usdctofiat.xyz/developers/apps](https://usdctofiat.xyz/developers/apps/)
- Bot guide: [usdctofiat.xyz/developers/bots](https://usdctofiat.xyz/developers/bots/)
- One-shot scripts that don't need scaffolding: [`/usdctofiat`](../usdctofiat) at the repo root
