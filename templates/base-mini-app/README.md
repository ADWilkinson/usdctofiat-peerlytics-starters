# Base Mini App Template

Compact USDCtoFiat starter for Base distribution. It is a standard Next.js app
that uses Base Account and creates a USDCtoFiat deposit on Base. Attribution is
configured through `NEXT_PUBLIC_INTEGRATOR_ID`; optional referral attribution
uses `NEXT_PUBLIC_REFERRAL_ID`.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin before testing discovery
or embeds. Local development can use `http://localhost:3000`.

The template keeps `__INTEGRATOR_ID__` and `TODO_SET_REFERRAL_ID` as scaffold
placeholders, but the UI does not show those implementation labels to users.

## Customize

- Edit `app/mini-app-cashout.tsx` to change the default routes, labels, and
  identifier fields.
- Keep `NEXT_PUBLIC_INTEGRATOR_ID` set so every `offramp()` call can be
  attributed.
- Set `NEXT_PUBLIC_REFERRAL_ID` only when you have a real referral code for
  partner traffic. The starter omits `referralId` when the placeholder is still
  present.
- Keep the UI tight. This template is meant to open from a Base app surface, so
  avoid landing-page sections, decorative cards, or extra explainers.
- Do not add social-client manifests, frame SDKs, or client-specific discovery
  files. Base discovery should come from the public Next.js origin and Base.dev
  app metadata.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` links visible for builders and agents.

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
NEXT_PUBLIC_INTEGRATOR_ID=your-app
NEXT_PUBLIC_REFERRAL_ID=your-real-referral-code
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
5. Add Builder Code attribution only after Base.dev issues the real code.
6. Verify attribution in Base.dev, a block explorer, or the Builder Code validation tool.

## Resources

- Base app docs: https://docs.base.org/apps/quickstart/build-app
- Standard web app path: https://docs.base.org/apps/guides/migrate-to-standard-web-app
- Base app rewards: https://docs.base.org/apps/growth/rewards
- Builder Codes: https://docs.base.org/apps/builder-codes/app-developers
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Webhooks: https://usdctofiat.xyz/developers/webhooks/
