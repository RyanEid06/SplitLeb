# SplitLeb

Split bills, track shared expenses, and settle balances in USD or Lebanese
pounds. SplitLeb is an offline-first web app that stores groups and bills on your
device; it needs no account or server.

**Use SplitLeb:** [Open the web app](https://splitleb.pages.dev) · [Download the official Android APK](https://github.com/RyanEid06/SplitLeb/releases/latest/download/SplitLeb-Android-1.0.1.apk) · [Latest release and checksum](https://github.com/RyanEid06/SplitLeb/releases/latest)

The production web/PWA app is **2.0.0**. The separately maintained Android app
is **1.0.1**. The Android release includes a SHA-256 checksum alongside the APK.

## Features

- Split bills equally, by shares, or by custom item amounts; track extras,
  discounts, payments, and transfers.
- Save groups and members, review history and statistics, and duplicate bills.
- Keep USD and LBP balances separate. SplitLeb does not convert currencies;
  LBP entry uses thousands (`630` means LBP 630,000).
- Work offline and save changes explicitly. Export and import JSON backups.

## Platforms and privacy

The current web app is a React and TypeScript progressive web app built with
Vite. The web app keeps records in browser storage on the SplitLeb origin. The
Android APK is a separate app and keeps its own local data. No account is
required. Keep an exported backup because browser storage can be cleared or
evicted by the device. Web updates keep saved records on the same origin. The
current app uses IndexedDB version 3; do not redeploy the archived V1 app
unchanged to an origin already upgraded to version 3, because it expects the
older database version. JSON backup imports support schema versions 1 and 2;
exports use schema 2.

## Build the web app

Use Node.js and npm:

```sh
npm ci
npm run dev
npm run build
```

The production web app is deployed from `main` at [splitleb.pages.dev](https://splitleb.pages.dev).
Android source and release information are maintained on the
[`android-app` branch](https://github.com/RyanEid06/SplitLeb/tree/android-app).
