# SplitLeb V1 — archived web application

This branch preserves the original web app. Its application code is archived at
[`web-v1-archive-2026-10-18`](https://github.com/RyanEid06/SplitLeb/tree/web-v1-archive-2026-10-18)
(`e0ccf80`); later commits maintain documentation only.

The current [web/PWA app](https://splitleb.pages.dev/) is maintained on
[`main`](https://github.com/RyanEid06/SplitLeb/tree/main), incorporating completed
V2. The separate [`android-app`](https://github.com/RyanEid06/SplitLeb/tree/android-app)
branch provides [official Android 1.0.1](https://github.com/RyanEid06/SplitLeb/releases/tag/android-v1.0.1).
These are the three branches; there is no separate `v2` branch.

**Split fairly. Settle simply.**

SplitLeb is an offline-first expense-sharing web app for organizing group expenses, dividing bills, and calculating who owes whom. It is built with React, TypeScript, and IndexedDB, with a focus on accurate financial calculations and convenient local use.

**[Open the archived V1 preview](https://v1.splitleb.pages.dev/)**

The preview has separate browser storage from production. This is historical
code, not the current storage/import repair. Do not deploy it over a production
database upgraded to version 3 or clear user data to downgrade. See
[current recovery guidance](https://github.com/RyanEid06/SplitLeb/blob/main/docs/PRODUCTION-PROMOTION.md#recovery-constraints).

## Features

- **Groups and bills:** Save groups, manage participants, and keep track of itemized shared expenses.
- **Flexible splitting:** Split expenses equally, by weighted shares, or with custom amounts.
- **Cent-accurate calculations:** Use integer-based monetary allocations to avoid floating-point rounding mistakes.
- **Settlement suggestions:** Calculate payment transfers between participants to settle shared balances.
- **History:** Review saved bills and past expense activity.
- **Local persistence:** Keep saved data in your browser's IndexedDB storage.
- **Backup and restore:** Export and import JSON data to transfer or safeguard local records.
- **Offline-friendly PWA:** Service-worker caching supports use without a network connection where cached resources are available.
- **Automated tests:** Core allocation, settlement, bill-review, and persistence logic is covered by Vitest tests.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router |
| Local storage | IndexedDB via `idb` |
| Testing | Vitest |
| Delivery | Cloudflare Pages (archived V1 preview) |

## Getting started

Install a supported version of Node.js and npm, then run:

```bash
git clone --branch v1 https://github.com/RyanEid06/SplitLeb.git
cd SplitLeb
npm ci
npm run dev
```

Open the local development URL printed by Vite.

## Quality checks

```bash
npm run lint
npm run test:run
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Data and privacy

SplitLeb's application data is saved locally in your browser using IndexedDB. Clearing your browser's site data can remove saved groups and bills, so export a backup before resetting or switching devices. JSON backups should be stored carefully if they contain private financial information.

## Links

- [Archived V1 preview](https://v1.splitleb.pages.dev/)
- [Current production web/PWA](https://splitleb.pages.dev/)
- [Current web source and documentation](https://github.com/RyanEid06/SplitLeb/tree/main)
- [Official Android 1.0.1 release](https://github.com/RyanEid06/SplitLeb/releases/tag/android-v1.0.1)

## Project status

Archived version of an independent software project. For the current portfolio
demonstration and maintained documentation, open the production app or `main`.
The feature list and development commands above describe this V1 source only.
