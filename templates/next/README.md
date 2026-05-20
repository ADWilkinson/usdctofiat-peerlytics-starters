# Next.js Offramp Template

Production web starter for `@usdctofiat/offramp` using Next.js App Router, Privy, React 19, and viem.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_PRIVY_APP_ID` before opening the app. The template keeps `__INTEGRATOR_ID__` and `TODO_SET_REFERRAL_ID` visible until the scaffold CLI replaces them or you set your production values.

## Customize

- Edit `app/page.tsx` to change the default platform/currency and input labels.
- Keep `integratorId` on every `offramp()` call so deposits can be attributed.
- Replace `TODO_SET_REFERRAL_ID` before shipping partner traffic.

## Deploy

Deploy like any standard Next.js app. In Vercel, set `NEXT_PUBLIC_PRIVY_APP_ID` for Preview and Production.
