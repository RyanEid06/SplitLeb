<p align="center">
  <img src="public/splitleb-logo.png" width="112" alt="SplitLeb logo">
</p>

# SplitLeb

Split bills, track shared expenses and settle balances in USD or Lebanese pounds.
SplitLeb works offline and keeps bills and groups on your device. No account or
server is needed.

**[Download Android 1.0.0](https://github.com/RyanEid06/SplitLeb/releases/tag/android-v1.0.0)**
— permanently signed APK with a full mint launcher icon. Download
`SplitLeb-Android-1.0.0.apk` from the release assets; the checksum is included.

## What you can do

- Split items equally, by shares or with custom amounts.
- Track discounts, extras, payments and settlement transfers.
- Reuse groups, review history and statistics, duplicate bills and share summaries.
- Export and import JSON backups, including older supported backup formats.
- Create, edit and reopen saved bills offline.

Changes use an explicit Save action, with protection against accidental
navigation. USD and LBP stay separate; there is no exchange-rate conversion.
LBP entry uses thousands: `630` means LBP 630,000. Settlement transfers retain
LBP 1,000 rounding. Menu prices are treated as tax-included.

## Android installation and backups

The Android app packages the same React application locally through Capacitor.
It can cold-launch without a connection; it does not load the hosted website.
Updates are delivered as signed APKs. Android backup export opens the system
share chooser: choose a durable destination and confirm the JSON file was saved.

**Upgrading from the earlier debug APK:** export and verify a JSON backup before
uninstalling it. Install the signed release, then import the backup. The debug
and permanent signing keys differ, so Android cannot update one over the other.
Uninstalling removes local app records.

The web/PWA and Android app keep separate local data. Use backups to move
between them or devices. Clearing app/browser data can remove records; offline
storage is not a backup.

## Source and documentation

| Branch | Purpose |
| --- | --- |
| [`android-app`](https://github.com/RyanEid06/SplitLeb/tree/android-app) | Android release source, resources and build scripts based on V2 |
| [`v2`](https://github.com/RyanEid06/SplitLeb/tree/v2) | Completed web/PWA V2 |
| [`main`](https://github.com/RyanEid06/SplitLeb/tree/main) | Existing production web source |

The Android release does not merge or deploy changes over the web branches.

- [Android architecture, builds, signing and verification](docs/ANDROID.md)
- [Historical V2 architecture and verification](docs/v2/README.md)
- [Maintainer continuity](V2-CONTINUITY.md)

## Development

Verified with Node.js 24.18.0 and npm 11.16.0. Android also needs JDK 21 and the
SDK versions documented in the Android guide.

```sh
npm ci
npm run dev
```

For a production web build and preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Development does not register the production service worker. The web/PWA caches
its shell after the first successful online visit; updates wait for unsaved
changes and reject incomplete or mixed assets. Production hosting must serve
`index.html` for app routes and real files for assets, icons, manifest and worker.
Existing Cloudflare configuration is unchanged.

```sh
npm run android:sync    # build web assets and sync Android
npm run android:open    # Android Studio
npm run android:build   # debug APK
npm run android:release # Windows; requires the existing private signing key
```

## Checks

```sh
npm run typecheck
npm run lint
npm run test:run
npx playwright install chromium
```

With production preview running on port 4173:

```sh
npm run qa:browser -- http://127.0.0.1:4173
npm run qa:unsaved
npm run qa:prepare-v1
npm run qa:pwa
npm run qa:android-shell
```

QA uses synthetic data and isolated browser profiles. Results go to ignored
`output/`; an existing full Chromium can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The legacy upgrade fixture uses immutable
`git archive`, without checking out or modifying `main`.

Release verification: **134 unit tests**, TypeScript/ESLint clean, **5 native
shell checks**, web/PWA workflows and signed Android build pass. Android release
lint has **0 errors / 8 advisory warnings**. Browser-native bridge mocks are not
phone tests. The owner accepted the earlier debug build on their phone; final
signed/icon-changed phone checks and other manual limits are in the
[Android guide](docs/ANDROID.md#physical-device-follow-up).
