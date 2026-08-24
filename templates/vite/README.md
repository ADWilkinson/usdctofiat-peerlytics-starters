# Vite Offramp Template

Lean SPA starter for `@usdctofiat/offramp` using Vite, React 19, Privy, and viem.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_PRIVY_APP_ID` before opening the wallet flow. The template builds
without secrets and shows a setup screen until the app ID is present.

## Customize

- Edit `src/App.tsx` to change the default platform/currency and input labels.
- Keep an explicit `mode` on every `cashout()` call. This starter uses `best`.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` visible somewhere in your developer/admin surface so future maintainers and agents have canonical SDK, OTC, and Peerlytics links.

## Deploy

Build with `npm run build`, then deploy the generated `dist/` folder to your static host.

## Resources

- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Peerlytics developers: https://peerlytics.xyz/developers
