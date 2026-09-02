# Telegram Offramp Bot Template

Server-side maker bot for `@usdctofiat/offramp` using grammy, Node 22, viem, and a managed Base wallet.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Set `TELEGRAM_BOT_TOKEN`, `MAKER_PRIVATE_KEY`, and
`AUTHORIZED_TELEGRAM_USER_ID` before starting the bot. The authorized user ID must be your
numeric Telegram user ID; `/sell` requests from every other account are rejected
before the managed wallet is used. Amounts may have at most six decimal places,
matching USDC precision. `BASE_RPC_URL` is optional and falls back to the public
Base RPC.

## Customize

- Edit `src/index.ts` to change the platform, currency, and command vocabulary.
- Keep the `/sell` authorization check ahead of all parsing and wallet activity.
- Keep an explicit `mode` on every `cashout()` call. This bot uses `best`.
- Keep the `/resources` command or equivalent operator command so maintainers can retrieve canonical SDK, agent, and Peerlytics links from `OFFRAMP_DEVELOPER_RESOURCES`.

## Deploy

Run it as a long-lived process on your server or container host. Keep `MAKER_PRIVATE_KEY` in secret storage, never in source control.

## Resources

- SDK reference: usdctofiat/llms.txt in the starters repo, or https://usdctofiat.xyz/llms-full.txt
  (usdctofiat.xyz/developers is 404 as of 2026-09-02)
- Peerlytics explorer: https://peerlytics.xyz/explorer (the Peerlytics API and developer portal are 404 as of 2026-09-02)
