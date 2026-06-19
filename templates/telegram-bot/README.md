# Telegram Offramp Bot Template

Server-side maker bot for `@usdctofiat/offramp` using grammy, Node 22, viem, and a managed Base wallet.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Set `TELEGRAM_BOT_TOKEN` and `MAKER_PRIVATE_KEY` before starting the bot. `BASE_RPC_URL` is optional and falls back to the public Base RPC. The template keeps `__INTEGRATOR_ID__` and `TODO_SET_REFERRAL_ID` visible until the scaffold CLI replaces them or you set your production values.

## Customize

- Edit `src/index.ts` to change the platform, currency, and command vocabulary.
- Keep `integratorId` on every deposit so activity is attributed.
- Replace `TODO_SET_REFERRAL_ID` before shipping partner traffic.
- Keep the `/resources` command or equivalent operator command so maintainers can retrieve canonical SDK, webhook, and Peerlytics links from `OFFRAMP_DEVELOPER_RESOURCES`.

## Deploy

Run it as a long-lived process on your server or container host. Keep `MAKER_PRIVATE_KEY` in secret storage, never in source control.

## Resources

- Bot guide: https://usdctofiat.xyz/developers/bots/
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- Webhooks: https://usdctofiat.xyz/developers/webhooks/
