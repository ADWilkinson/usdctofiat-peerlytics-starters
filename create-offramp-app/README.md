# create-offramp-app

Scaffold an app using the maintained [templates in this repo](../templates).

```bash
npx create-offramp-app@latest my-offramp --template=next
cd my-offramp
npm install
npm run dev
```

Templates: `next` (default), `vite`, and `telegram-bot`.
`base-mini-app` is available by copying it from the repo only.

Flags:

- `--template=next|vite|telegram-bot`: select a template.
- `--help`, `-h`: show usage.
- `--integratorId=<id>`: deprecated and silently ignored. The v9 SDK applies fixed attribution.

Scaffolding is non-interactive and requires an empty or new target directory.
See the [template documentation](https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/tree/main/templates)
and [SDK reference](https://github.com/ADWilkinson/usdctofiat-peerlytics-starters/blob/main/usdctofiat/llms.txt).

For local development, run `npm install` then `npm test` in this directory.
Packing builds the CLI with TypeScript and copies the three repo templates into
an ignored staging directory; template changes belong in the repo's `templates/`.
