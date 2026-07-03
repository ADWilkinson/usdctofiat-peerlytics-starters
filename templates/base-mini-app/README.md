# Base Mini App Template

Compact USDCtoFiat starter for Base distribution. It uses Base Account,
creates a USDCtoFiat deposit on Base, and keeps attribution visible through
`__INTEGRATOR_ID__` and `TODO_SET_REFERRAL_ID`.

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
- Keep `integratorId` on every `offramp()` call so deposits can be attributed.
- Replace `TODO_SET_REFERRAL_ID` before shipping partner traffic.
- Keep the UI tight. This template is meant to open from a Base app surface, so
  avoid landing-page sections, decorative cards, or extra explainers.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` links visible for builders and agents.

## Base Hooks

- `app/mini-app-cashout.tsx` initializes `@base-org/account` with app name,
  app logo, and Base mainnet chain id.
- The wallet client is built from the Base Account EIP-1193 provider and passed
  straight into `@usdctofiat/offramp`.
- `app/page.tsx` keeps the Open Graph metadata for share/discovery surfaces.

Before publishing, verify the public app with the current Base app builder,
app verification, builder-code, and rewards flows.

## Deploy

Deploy like any standard Next.js app. In Vercel or your host, set:

```bash
NEXT_PUBLIC_APP_URL=https://your-mini-app.example
```

The public origin must serve:

- `/`
- a 3:2 Open Graph image at `/opengraph-image`
- a 200x200 icon at `/icon.png`

## Resources

- Base app docs: https://docs.base.org/apps/quickstart/build-app
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Webhooks: https://usdctofiat.xyz/developers/webhooks/
