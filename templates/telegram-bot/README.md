# Telegram Offramp Bot Template

Server-side maker bot for `@usdctofiat/offramp` using grammy, Node 22, viem, and a managed Base wallet.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Set `TELEGRAM_BOT_TOKEN`, `MAKER_PRIVATE_KEY`, `AUTHORIZED_TELEGRAM_USER_ID`,
and `INTEGRATOR_ID` before starting the bot. The authorized user ID must be your
numeric Telegram user ID; `/sell` requests from every other account are rejected
before the managed wallet is used. `BASE_RPC_URL` is optional and falls back to
the public Base RPC. `REFERRAL_ID` is optional; the starter omits `referralId`
while it is still `TODO_SET_REFERRAL_ID`. If you are copying the template
without the scaffold CLI, replace `__INTEGRATOR_ID__` yourself.

## Customize

- Edit `src/index.ts` to change the platform, currency, and command vocabulary.
- Keep the `/sell` authorization check ahead of all parsing and wallet activity.
- Keep `integratorId` on every deposit so activity is attributed.
- Set a real `REFERRAL_ID` before shipping partner traffic.
- Keep the `/resources` command or equivalent operator command so maintainers can retrieve canonical SDK, agent, and Peerlytics links from `OFFRAMP_DEVELOPER_RESOURCES`.

## Deploy

Run it as a long-lived process on your server or container host. Keep `MAKER_PRIVATE_KEY` in secret storage, never in source control.

## Resources

- Bot guide: https://usdctofiat.xyz/developers/bots/
- SDK guide: https://usdctofiat.xyz/developers/offramp-sdk/
- Peerlytics developers: https://peerlytics.xyz/developers
