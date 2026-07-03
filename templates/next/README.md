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
Set `NEXT_PUBLIC_INTEGRATOR_ID` for attribution. `NEXT_PUBLIC_REFERRAL_ID` is
optional; the starter omits `referralId` while it is still
`TODO_SET_REFERRAL_ID`. If you are copying the template without the scaffold
CLI, replace `__INTEGRATOR_ID__` yourself.

## Customize

- Edit `app/page.tsx` to change the default platform/currency and input labels.
- Keep `integratorId` on every `offramp()` call so deposits can be attributed.
- Set a real `NEXT_PUBLIC_REFERRAL_ID` before shipping partner traffic.
- Keep `OFFRAMP_DEVELOPER_RESOURCES` visible somewhere in your developer/admin surface so future maintainers and agents have canonical SDK, webhook, and Peerlytics links.

## Deploy

Deploy like any standard Next.js app. In Vercel, set
`NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_INTEGRATOR_ID` for Preview and
Production. Set `NEXT_PUBLIC_REFERRAL_ID` only when you have a real partner
code.

## Resources

- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- App guide: https://usdctofiat.xyz/developers/apps/
- Webhooks: https://usdctofiat.xyz/developers/webhooks/
