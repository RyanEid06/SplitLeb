# SplitLeb

A private, offline-first bill splitter for USD and Lebanese pounds. No account or server is needed.

## Android test branch

`android-app` adds a Capacitor Android host to the completed V2 web application.
The same React app and IndexedDB database run from assets packaged in the APK.
See [Android build, architecture and QA](docs/ANDROID.md) for prerequisites,
commands, test evidence and device checks. This is a debug test milestone;
permanent release signing follows physical-device QA.

```sh
npm run android:sync
npm run android:open
npm run android:build
```

## V2 review branch

All V2 work is on the published [GitHub `v2` review branch](https://github.com/RyanEid06/SplitLeb/tree/v2). Production `main` remains under the owner's control. This branch has not been merged or deployed over production.

Start with [V2-CONTINUITY.md](V2-CONTINUITY.md) when resuming work. The complete [owner brief](docs/v2/OWNER-BRIEF.md), [baseline audit](docs/v2/AUDIT.md), [architecture](docs/v2/ARCHITECTURE.md), [verification](docs/v2/VERIFICATION.md) and [review report](docs/v2/FINAL-REPORT.md) are kept in the repository.

## Run locally

Verified with Node.js 24.18.0 and npm 11.16.0.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Development never registers the production service worker, including on custom ports.

```sh
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Use the production preview for offline/PWA verification. HTTPS or a trusted localhost origin is required for service workers. Production hosting must serve `index.html` for application routes and real files for `/assets/*`, `/sw.js`, icons and the manifest. The existing Cloudflare production configuration has not been changed.

## Browser QA

Development-only Playwright, axe and fake-indexeddb dependencies are locked. Install the matching browser once:

```sh
npx playwright install chromium
```

With production preview running at port 4173:

```sh
npm run qa:browser -- http://127.0.0.1:4173
npm run qa:unsaved
npm run qa:prepare-v1
npm run qa:pwa
```

`qa:prepare-v1` exports immutable production commit `0a1334e` with `git archive` inside ignored `output/playwright`, then builds it using the installed tools. It does not check out or modify `main`; Windows includes the required `tar` executable. `qa:pwa` starts a separate local test server, creates records through the actual V1 UI, swaps builds on the same origin, closes/reopens a persistent browser offline and exercises worker updates.

Scripts create isolated synthetic browser data and write screenshots, axe reports and result JSON to `output/playwright`. To use an existing full Chromium executable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path. No personal browser profile or production data is used.

## Saving and money

- New bills start as drafts. Review saves the bill; Save bill makes a draft active. Save as draft remains available under bill options.
- Changes require an explicit save. Unsaved forms are protected against accidental navigation and PWA update reloads. Mark settled saves current payments and status together.
- USD and LBP remain separate; there is no exchange-rate conversion.
- LBP entry uses thousands: `630` means LBP 630,000. Settlement transfers retain the existing LBP 1,000 rounding.
- Menu prices are treated as tax-included. Add only applicable extras.
- Equal, shares and custom splits, discounts, payment balances, transfers, saved/archived group members, statistics, duplication and summaries remain available.

## Offline, updates and backups

After a successful first online visit, the production app shell and assets are cached. Saved bills/groups stay in IndexedDB and remain usable offline. An update is offered when ready; it waits for unsaved changes and never automatically reloads while typing. Incomplete or mixed-deployment shells are rejected.

History contains Export backup and Import backup. Clearing site/browser data or browser eviction can remove records; the offline cache is not a backup. Export before changing browsers, devices or origins.

The database remains `splitleb-local-db` at schema version 2. Backup schema 1 and schema 2 imports are supported; exports remain schema 2. Duplicates are skipped and conflicting groups stop the import. No new database migration or data clearing is introduced by V2.

Portable financial parity cases live in [golden-bills.json](src/domain/bill/fixtures/golden-bills.json). Android uses these same domain functions through Capacitor.

## Acceptance limits

Automated Chromium workflows, responsive checks and axe results are recorded in the verification document. Physical-device installation, VoiceOver/TalkBack/NVDA listening, Safari/Firefox and hosted Cloudflare acceptance are still manual review tasks. No numerical score in the review report represents formal certification.
