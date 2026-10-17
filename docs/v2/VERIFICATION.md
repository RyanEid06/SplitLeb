# V2 verification — 2026-10-17

Verified implementation commit: `4270880e04acf3eba4724336a6d95e8498ce8b92` on `v2`. Documentation commits after this do not change the application. Production `main` and local `origin/main` remain `0a1334ed44cde1ef1cb48550fef18a71356f41e1`. No push, merge, deployment, tag or Cloudflare configuration change was performed.

## Commands and exact results

| Check                    | Command                                                               | Result                                                                      |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Locked install           | `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` | 190 packages installed, success                                             |
| TypeScript               | `npm run typecheck`                                                   | success, no diagnostics                                                     |
| Lint                     | `npm run lint`                                                        | success, 0 errors, 0 warnings                                               |
| Unit + integration       | `npm run test:run`                                                    | **123/123 tests**, 21 files passed                                          |
| Production               | `npm run build`                                                       | success, 78 modules                                                         |
| Responsive/UI            | `node scripts/qa-browser.mjs http://127.0.0.1:4173`                   | all checks passed, no runtime errors                                        |
| Unsaved updates          | `node scripts/qa-unsaved.mjs`                                         | setup/person/item drafts, activation interval and late timeout protected    |
| Legacy build preparation | `node scripts/prepare-v1-qa.mjs`                                      | success; original JS/CSS hashes reproduced from immutable production source |
| Upgrade/offline/update   | `node scripts/qa-pwa.mjs`                                             | all six lifecycle scenarios passed, including gzip-served HTML/JS/CSS       |

Command logs are committed as `final-install.txt`, `final-typecheck.txt`, `final-lint.txt`, `final-tests.txt`, `final-build.txt`, `final-browser.txt`, `final-unsaved.txt`, `final-pwa.txt`. Baseline counterparts are kept separately.

The 27 added tests include 11 checks using actual IndexedDB APIs via fake-indexeddb (atomic edits, migration and backup integrity), 12 portable financial fixtures, three worker-registration tests and one multiple-payment editing regression. The original 96 tests are retained. Generated V1 exports/browser profiles are excluded from lint, test discovery and Vite watching; application source remains fully checked. This also prevents Windows locked-profile files from terminating the development watcher.

An optional fresh reinstall initially met a Windows lock on Vite's loaded native binding. Stopping the session's local servers released it; the final locked install above succeeded. Initial sandbox temp-file restrictions are documented in the baseline audit. Neither condition was a financial/product regression.

## Browser workflows

Final browser version: **Chromium 156.0.8078.4**, using the locked Playwright 1.64.1 browser installation. Runs use isolated synthetic contexts/profiles, never a personal browser profile.

- Create a standalone bill without a required title; add people; preserve keyboard Enter navigation through item/quantity/price.
- Type decimal amounts character by character; retain `10.01` rather than losing the decimal separator.
- Open assignment dialog; keyboard Escape returns focus; enter fractional shares; reject invalid custom totals before review; return to equal allocation.
- Add tip and discount; show exact extras previews and item breakdowns.
- Preserve $10.01 remainder allocation ($5.01/$5.00); enter payment; Mark settled; reload and independently read the saved payment/status from IndexedDB.
- Cancel dirty navigation without losing the receipt.
- Create group, retain input after duplicate-name failure, add/archive/restore members, preselect the correct group, create a linked LBP bill with stable member IDs and confirm `630` becomes LBP630,000.
- Export a current backup, import it, skip duplicates and retain records.
- Import legacy-format financial fixtures with 21 people, duplicate display names, long names/titles, large LBP amounts and a one-cent payer.
- Show safe missing-bill/unknown-route errors without internal IDs.

At **320, 360, 390, 412, 768, 1280 and 1600px**, Home, New Bill, Groups, History, USD workspace, Review and LBP workspace passed document-width overflow checks. All four group sections were exercised at each width. Edge fixtures were also checked at 320/390/1280.

**14 axe checks found 0 violations** for WCAG2 A/AA and WCAG2.1 AA tags: Home, creation, assignment, workspace/extras, review, history, four group sections, three financial edge fixtures and not-found. Keyboard/modal focus and error/status behavior were exercised separately.

Screenshots were visually inspected for phone/desktop Home, setup/people, receipt/extras, assignment, review/payment/settlement, all group sections, history/backup, empty states, large-money and missing-record views. Final screenshots, axe JSON and browser result JSON are retained under ignored `output/playwright/`; committed command logs provide the durable text record.

## Production upgrade / offline proof

The test server serves the original production bundle first and the V2 bundle later on **the same origin**. Records are created through the actual V1 UI: saved bill, saved group and archived member. After loading V2 and accepting its update, every stored field is compared with the captured V1 records and remains equal.

The browser is then closed entirely and reopened with its persistent profile **and network disabled**. It opens a deep bill URL, creates/reviews a bill, uses a saved group to create another bill, visits History and exports a backup. These are actual offline operations, not a simulated offline banner.

A real later worker update waits while bill edits are dirty; Save permits Update; the note survives reload. An additional open tab continues offline, and its older cache is retained. A missing-asset update becomes redundant without deleting the usable shell. MIME-correct HTML changed during installation also fails its content hash, preserving the working offline build.

The separate unsaved-form script verifies typing in setup/person/item forms and after Update was chosen, including a late controller-change event after the ten-second timeout. Reload never discards those entries.

## Data compatibility

- Database name, version 2, store names, indexes and backup export schema remain unchanged.
- Real v1-store upgrade preserves the original bill byte-for-value and adds the empty group store/indexes.
- Legacy backup import/current export/current reimport round trip preserves values and skips duplicates.
- Existing conflict/duplicate/reference tests remain green. New malformed nested records are rejected before any write.
- Existing archived/member identity, balances, statistics and settlement tests remain green.

## Build measurements

| Asset      | V1 raw / gzip      | V2 raw / gzip          |
| ---------- | ------------------ | ---------------------- |
| CSS        | 74.22 / 12.43 kB   | **25.00 / 5.81 kB**    |
| JavaScript | 394.62 / 116.81 kB | **388.39 / 117.06 kB** |

Raw CSS is approximately 66.3% smaller. JavaScript is slightly smaller raw and essentially unchanged compressed; do not describe this as a large JS performance gain. No formal large-history performance benchmark was run.

## Acceptance limits

No physical-phone installation/touch acceptance, Safari/Firefox run, NVDA/VoiceOver/TalkBack listening, hosted Cloudflare preview test or CI run was performed. Browser storage eviction cannot be prevented absolutely; backups remain essential. These limits are separate from verified local Chromium behavior and do not authorize production release.
