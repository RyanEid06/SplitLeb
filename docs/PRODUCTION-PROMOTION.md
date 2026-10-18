# Web production promotion — 2026-10-18

The owner approved replacing the old V1 production UI with the completed V2 web
app, retaining exactly three branches: `main` (current web), `v1` (historical web),
and `android-app` (separate APK). The former `v2` source is merged into main with
history preserved, then its branch is removed after verification.

## Preservation

| Source | Immutable original commit | Preservation |
| --- | --- | --- |
| V1 production | `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064` | `v1`, annotated `web-v1-archive-2026-10-18` tag |
| Completed V2 | `d465ff0a4cf9dec19b10e7bf33a83cbb75be9622` | merge ancestry and annotated `web-v2-before-production-2026-10-18` tag |
| Android 1.0.1 | `bb7d3dabcc800e5927d764b00d57ad06596b561d` | `android-app` and original `android-v1.0.1` release/tag |

A complete verified local Git bundle is retained at
`output/production-switch/pre-switch.bundle`. Remote archive refs were pushed
before integrating or changing main. Main is advanced normally; no force push or
history replacement is used. No Android source, dependencies, app ID, signing key
or APK release changes are part of the web promotion.

## Data and build

Production continues at `https://splitleb.pages.dev`; Cloudflare's production
branch remains main. Existing IndexedDB records remain on the same origin in
`splitleb-local-db`. The shared import/storage repair migrates database versions
1/2 to 3 with missing-store/index repair and no record reset. Backup format stays
schema 1/2 compatible; exports remain schema 2. Web version becomes 2.0.0.

The repair is selectively copied from reviewed Android 1.0.1 shared TypeScript,
not merged from the Android branch. Web file download export, V2 UI and PWA
service-worker/update behavior are preserved. Local orphan Android build outputs
are ignored rather than removed when using this multi-branch checkout.

QA reconstructs exact archived V1 production source at e0ccf80, creates bills and
groups through its actual UI, then serves the new build on that same isolated
origin. It verifies field-for-field preservation, cache updates and offline
restart. No real production browser profile or user database is operated on.

## Recovery constraints

Archive tags and bundle preserve source history. Cloudflare's old immutable
deployment URLs remain historical snapshots, each with its own browser origin.
They do not move or copy saved data from the production domain.

After a browser upgrades to DB v3, old unmodified V1 code opening DB v2 will fail
with VersionError. Do not blindly redeploy V1 or clear site data as a rollback.
Prepare a recovery build from the archived V1 UI retaining the v3-compatible
storage layer and a fresh asset/service-worker build. Verify it in an isolated
same-origin v3 profile before deployment. Preserve existing data and backups.

## Verification ledger

- **149 tests / 24 files passed**, including the unchanged owner's backup.
  Without the optional private-file path, 148 tests run and one acceptance test
  skips. TypeScript, ESLint, production build and whitespace checks for promotion
  changes passed. Historical V2 owner-brief Markdown hard breaks and captured
  logs retain their original whitespace; those files were preserved unchanged.
- Six original-backup import scenarios passed: fresh DB, legacy v1 bills-only,
  v2 bills-only, v2 missing indexes, post-commit refresh failure, file-read failure.
  Successful cases also verify duplicates and preservation of existing records.
- All six PWA workflows passed with exact archived V1 source: original-UI record
  creation; same-origin field preservation/update; persistent browser offline
  restart; dirty-update and multiple-tab cache safety; incomplete-update rejection;
  mixed-deployment content rejection. No user database or profile was accessed.
- Responsive workflows passed at 320, 360, 390, 412, 768, 1280 and 1600px;
  accessibility checks found no violations. Financial/workflow cases, backup
  roundtrip, missing-record/route states and unsaved input checks passed.
- Independent review identified original V1 tabs blocking database upgrades.
  The real old-tab regression first failed the expected recovery message. After
  adding typed guidance it exposed queued opens with no blocked event, leaving
  History loading indefinitely. These waits now fail recoverably after five
  seconds; abandoned native connections close when they eventually open.
- `qa:legacy-tabs` now passes Home/History/Groups guidance and closing the old V1
  tab followed by reload: all **18 bills and 3 groups remain unchanged**, DB v3.
  Layout, financial calculations and Android source remain unchanged.
- Follow-up independent review confirms the blocked/queued-open fix and found
  no remaining actionable issues.

Post-push deployment evidence is kept in ignored `output/production-switch/` and
reported in the chat. Historical `docs/v2` reports remain historical; they do not
stand in for this source's verification. Chromium tests are not physical-device
acceptance of every existing user's browser.

## Deployment and completed branch switch

- Promotion merge: `a0ee38e3c806ede19a62eb4f2b338ff4288bb00c`, parents are the
  original main e0ccf80 and completed V2 d465ff0. All original history remains.
- Exact-source Cloudflare Pages check: **success**; automatic production
  deployment `54d8be15-beb6-4d2f-96d8-544f780426a9`. Production remains
  `https://splitleb.pages.dev`. No manual hosting/domain changes were needed.
- Live production verified: new V2 UI on mobile/desktop; exact SHA-256 matches
  for `index-DokTKPlv.js`, `index-C19CYuKl.css` and approved logo. Synthetic
  18-bill/3-group import passed, 21 duplicates skipped, all fields survived reload,
  DB v3 confirmed, offline reload passed, no browser runtime errors.
- Verified V1's tree equals the original production tree and Android remains
  exactly bb7d3da. V2 had zero unique commits relative to main before deletion.
- Removed remote/local `v2` and the temporary local integration branch only after
  live verification. Exactly **main**, **v1**, **android-app** remain locally and
  remotely. The archived V2 tag and pre-switch bundle preserve recovery evidence.

Subsequent documentation-only confirmation does not change packaged runtime
inputs. Current deployment/status evidence and live screenshots are retained in
ignored `output/production-switch/`.
