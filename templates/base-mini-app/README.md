# Base Mini App Template

Compact USDCtoFiat starter for Base distribution. It is a standard Next.js app
that uses Base Account and creates a USDCtoFiat cash-out on Base. Copy this
directory from the starters repo. The published `create-offramp-app` CLI does not scaffold it.
The v9 SDK applies USDCtoFiat attribution automatically.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin before testing discovery
or embeds. Local development can use `http://localhost:3000`.

## Customize

- Edit `app/mini-app-cashout.tsx` to change the default routes, labels, and
  identifier fields.
- Keep an explicit `mode` on every `cashout()` call. This starter uses `best`.
- Keep `NEXT_PUBLIC_BASE_BUILDER_CODE` set to the Builder Code issued by Base
  Dashboard. The default `bc_srxybeyl` is the USDCtoFiat code for the reference
  deployment.
- Keep the UI tight. This template is meant to open from a Base app surface, so
  avoid landing-page sections, decorative cards, or extra explainers.
- Do not add social-client manifests, frame SDKs, or client-specific discovery
  files. Base discovery should come from the public Next.js origin and Base.dev
  app metadata.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` links visible for builders and agents, but only the keys that resolve — the bundle still advertises the developer portal removed on 2026-09-02.

## Base Hooks

- `app/mini-app-cashout.tsx` initializes `@base-org/account` with app name,
  app logo, and Base mainnet chain id.
- The wallet client is built from the Base Account EIP-1193 provider and passed
  straight into `@usdctofiat/offramp`.
- `app/page.tsx` keeps the Open Graph metadata for share/discovery surfaces.
- `app/icon.png/route.tsx` serves the 200x200 PNG icon used by Base Account.
- `app/opengraph-image.tsx` serves the 3:2 Open Graph image for discovery.

Before publishing, verify the public app with the current Base app builder,
app verification, builder-code, and rewards flows. Register app metadata in
Base.dev after the public origin is live.

## Deploy

Deploy like any standard Next.js app. In Vercel or your host, set:

```bash
NEXT_PUBLIC_APP_URL=https://your-mini-app.example
NEXT_PUBLIC_APP_KICKER=USDCtoFiat on Base
NEXT_PUBLIC_BASE_BUILDER_CODE=bc_srxybeyl
```

The public origin must serve:

- `/`
- a 3:2 Open Graph image at `/opengraph-image`
- a 200x200 icon at `/icon.png`

Verify the deployed origin before sharing it:

```bash
curl -I https://your-mini-app.example/
curl -I https://your-mini-app.example/icon.png
curl -I https://your-mini-app.example/opengraph-image
```

Then test the real flow in a browser/client with Base Account:

1. Connect a wallet on Base.
2. Create a small USDCtoFiat seller deposit.
3. Record the `depositId`, transaction hash, route, and public origin.
4. Register and verify the app on Base.dev.
5. Confirm `NEXT_PUBLIC_BASE_BUILDER_CODE` is the code issued by Base.dev.
6. Verify attribution in Base.dev, a block explorer, or the Builder Code validation tool.

## Resources

- Base app docs: https://docs.base.org/apps/quickstart/build-app
- Standard web app path: https://docs.base.org/apps/guides/migrate-to-standard-web-app
- Base app rewards: https://docs.base.org/apps/growth/rewards
- Builder Codes: https://docs.base.org/apps/builder-codes/app-developers
- SDK reference: usdctofiat/llms.txt in the starters repo, or https://usdctofiat.xyz/llms-full.txt
  (usdctofiat.xyz/developers is 404 as of 2026-09-02)
- Peerlytics explorer: https://peerlytics.xyz/explorer (the Peerlytics API and developer portal are 404 as of 2026-09-02)
