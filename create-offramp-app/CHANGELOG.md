# Changelog

All notable changes to `create-offramp-app` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.17] - 2026-10-08

### Security

- Update the Next.js template from next 16.3.0 to 16.3.8 (GHSA-vcvr-r3jv-pc5j).

### Changed

- Move source to ADWilkinson/usdctofiat-peerlytics-starters. Templates now come
  from that repo's maintained `templates/`: dead developer-portal links removed,
  chain switch before cashout, $1 minimum, and Telegram bot authorization via
  `AUTHORIZED_TELEGRAM_USER_ID`.
- Remove the integratorId prompt; `--integratorId` is deprecated and ignored.

## [0.1.16] - 2026-08-29

### Changed

- Publish homepage, repository, and keywords so `npm view create-offramp-app`
  points at https://usdctofiat.xyz/developers and the monorepo package path.
- Starters remain on `@usdctofiat/offramp` 9.0.0 `cashout({ mode: "best" })`.

### Security

- Generated Telegram bots continue to require `AUTHORIZED_TELEGRAM_USER_IDS`
  and reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC.

## [0.1.15] - 2026-08-29

### Changed

- Generate every starter on `@usdctofiat/offramp` 9.0.0 `cashout({ mode: "best" })`
  so `npx create-offramp-app@latest` matches the live SDK. Next and Vite now
  default to Revolut (direct rail) instead of Venmo (Verify-gated).
- Keep Next.js 16.3.0 on the web starter.

### Security

- Generated Telegram bots continue to require `AUTHORIZED_TELEGRAM_USER_IDS`
  and reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC.

## [0.1.14] - 2026-08-28

### Changed

- Generate every starter on `@usdctofiat/offramp` 9.0.0 so new integrations
  use the stake-to-take hard cut and method-scoped access/protection graph.
- Report the Telegram starter's managed-path delegation and fee accurately in
  `/resources`.

### Security

- Generated Telegram bots continue to require `AUTHORIZED_TELEGRAM_USER_IDS`
  and reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC.

## [0.1.13] - 2026-08-24

### Changed

- Generate every starter on `@usdctofiat/offramp` 8.0.2 so new integrations receive
  the managed-deposit Curator re-confirmation contract at deposit submission time.
- Derive template SDK version checks from the canonical `packages/offramp-sdk`
  release line instead of a hard-coded semver literal.

### Security

- Generated Telegram bots continue to require `AUTHORIZED_TELEGRAM_USER_IDS`
  and reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC.

## [0.1.12] - 2026-08-13

### Changed

- Generate every starter on `@usdctofiat/offramp` 5.2 so new integrations use
  the current `@zkp2p/sdk` 0.12 protocol client.

### Security

- Generated Telegram bots continue to require `AUTHORIZED_TELEGRAM_USER_IDS`
  and reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC.

## [0.1.11] - 2026-08-07

### Changed

- Generate starters on `@usdctofiat/offramp` v5. The template-level
  `offramp()` and `createOfframp()` flows are unchanged; the major release
  removes only the retired taker-tier helpers and static platform limits.

### Security

- Generated Telegram bots require `AUTHORIZED_TELEGRAM_USER_IDS` and reject
  `/sell` from accounts outside that allowlist before the managed wallet can
  approve or deposit USDC.

## [0.1.10] - 2026-08-05

### Changed

- Upgrade the generated Next.js starter to Next.js 16.3.0, so newly scaffolded
  applications get the faster server-side rendering, reduced prefetch traffic,
  and lower dev-server memory use from that release.

### Security

- Generated Telegram bots still require `AUTHORIZED_TELEGRAM_USER_IDS` and
  still reject `/sell` from accounts outside that allowlist before the managed
  wallet can approve or deposit USDC. Unchanged in this release, restated
  because the release contract requires every version to affirm it.

## [0.1.9] - 2026-07-28

### Security

- Require generated Telegram bots to configure
  `AUTHORIZED_TELEGRAM_USER_IDS` and reject `/sell` commands from accounts
  outside that allowlist before the managed wallet can approve or deposit USDC.
- Load the generated bot's documented `.env` file before validating its token,
  managed wallet key, and operator allowlist.

## [0.1.8] - 2026-07-24

### Changed

- Upgrade the generated Next.js starter to Next.js 16.2.11 so newly scaffolded
  applications include the upstream security fixes in that release.
