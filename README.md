<p align="center">
  <img src="public/splitleb-logo.png" width="112" alt="SplitLeb logo">
</p>

# SplitLeb

Split bills, track shared expenses and settle balances in USD or Lebanese pounds.
SplitLeb works offline and keeps bills and groups on your device. No account or
server is needed.

**[Open SplitLeb](https://splitleb.pages.dev)** — the finished V2 web app is now
the production app on `main`.

## Branches

| Branch | Purpose |
| --- | --- |
| [`main`](https://github.com/RyanEid06/SplitLeb/tree/main) | Current web/PWA production, based on completed V2 |
| [`v1`](https://github.com/RyanEid06/SplitLeb/tree/v1) | Archived original web app; application code preserved, documentation maintained |
| [`android-app`](https://github.com/RyanEid06/SplitLeb/tree/android-app) | Separate Android/APK implementation of the V2 app |

The former `v2` branch is incorporated into `main`; it is no longer a separate
development branch. Historical source is also preserved by archive tags.

Android is distributed separately: [official Android 1.0.1 APK and checksum](https://github.com/RyanEid06/SplitLeb/releases/tag/android-v1.0.1).
Official signed Android 1.0.0 can update in place. Web production does not bundle
Capacitor or Android build files.

## Features and saving

- Equal, shares and custom item splits; extras, discounts, payments and transfers.
- Saved groups, archived members, history, statistics, duplication and summaries.
- Offline editing with explicit Save and protection for unsaved changes.
- USD and LBP remain separate; no exchange-rate conversion. LBP entry uses
  thousands: `630` means LBP 630,000. Settlement transfers retain LBP 1,000 rounding.
- JSON backup export/import, including supported older formats. Existing records
  are kept, duplicate records are skipped, and conflicting groups stop import.

## Existing data and updates

The production address stays `https://splitleb.pages.dev`. Existing web records
remain on that origin in `splitleb-local-db`. The storage repair upgrades DB
versions 1/2 to 3, creating missing stores/indexes without resetting bills or
groups. Backup JSON still supports schema 1/2 and exports schema 2.

App-shell updates wait for unsaved work. Saved records are separate from offline
asset caches; updates do not clear user data. History contains Export backup and
Import backup. Browser clearing/eviction can remove local records, so keep backups.
Preview URLs, the archived V1 site and Android each have separate local storage.

## Development and verification

Verified with Node.js 24.18.0 and npm 11.16.0.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Production hosting serves `index.html` for app routes and real files for assets,
service workers, icons and the manifest. Cloudflare continues deploying `main`.
Development does not register production service workers.

```sh
npx playwright install chromium
npm run qa:browser -- http://127.0.0.1:4173
npm run qa:unsaved
npm run qa:prepare-v1
npm run qa:pwa
npm run qa:legacy-tabs
node scripts/qa-backup-import.mjs
```

QA uses isolated synthetic browser profiles and ignored `output/` artifacts.
`qa:prepare-v1` reconstructs the exact archived production commit `e0ccf80`;
`qa:pwa` creates records with its actual UI and tests the same-origin V2 upgrade,
offline restart and protected service-worker updates. Optional acceptance of an
unchanged private backup uses `SPLITLEB_REAL_BACKUP` for unit tests or a path
argument to `qa-backup-import.mjs`; private data is never committed.

See [production promotion and recovery](docs/PRODUCTION-PROMOTION.md),
[current continuity](V2-CONTINUITY.md), and the [historical V2 records](docs/v2/README.md).
