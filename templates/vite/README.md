# Vite Offramp Template

Lean SPA starter for `@usdctofiat/offramp` using Vite, React 19, Privy, and viem.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_PRIVY_APP_ID` before opening the wallet flow. The template builds
without secrets and shows a setup screen until the app ID is present. Set
`VITE_INTEGRATOR_ID` for attribution. `VITE_REFERRAL_ID` is optional; the
starter omits `referralId` while it is still `TODO_SET_REFERRAL_ID`. If you are
copying the template without the scaffold CLI, replace `__INTEGRATOR_ID__`
yourself.

## Customize

- Edit `src/App.tsx` to change the default platform/currency and input labels.
- Keep `integratorId` on every `offramp()` call so deposits can be attributed.
- Set a real `VITE_REFERRAL_ID` before shipping partner traffic.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` visible somewhere in your developer/admin surface so future maintainers and agents have canonical SDK, webhook, and Peerlytics links.

## Deploy

Build with `npm run build`, then deploy the generated `dist/` folder to your static host.

## Resources

- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Webhooks: https://usdctofiat.xyz/developers/webhooks/
