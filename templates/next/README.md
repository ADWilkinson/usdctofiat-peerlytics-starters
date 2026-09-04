# Next.js Offramp Template

Production web starter for `@usdctofiat/offramp` using Next.js App Router, Privy, React 19, and viem.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_PRIVY_APP_ID` before opening the wallet flow. The template
builds without secrets and shows a setup screen until the app ID is present.

## Customize

- Edit `app/page.tsx` to change the default platform/currency and input labels.
- Keep an explicit `mode` on every `cashout()` call. This starter uses `best`.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` visible somewhere in your developer/admin surface so future maintainers and agents have canonical SDK links. Render only the keys that resolve — the bundle still advertises the developer portal removed on 2026-09-02.

## Deploy

Deploy like any standard Next.js app. In Vercel, set
`NEXT_PUBLIC_PRIVY_APP_ID` for Preview and Production.

## Resources

- SDK reference: usdctofiat/llms.txt in the starters repo, or https://usdctofiat.xyz/llms-full.txt
  (usdctofiat.xyz/developers is 404 as of 2026-09-02)
- Peerlytics explorer: https://peerlytics.xyz/explorer (the Peerlytics API and developer portal are 404 as of 2026-09-02)
