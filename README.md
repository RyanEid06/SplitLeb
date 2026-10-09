# SplitLeb

**Split fairly. Settle simply.**

SplitLeb is an offline-first expense-sharing web app for organizing group expenses, dividing bills, and calculating who owes whom. It is built with React, TypeScript, and IndexedDB, with a focus on accurate financial calculations and convenient local use.

**[Try the live app](https://splitleb.pages.dev/)**

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
| Delivery | Cloudflare Pages (public demo) |

## Getting started

Install a supported version of Node.js and npm, then run:

```bash
git clone https://github.com/RyanEid06/SplitLeb.git
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

- **Live application:** https://splitleb.pages.dev/
- **Source code:** https://github.com/RyanEid06/SplitLeb

## Project status

Independent software project and portfolio application. For a quick demonstration, open the live app and create a sample group and expense.
