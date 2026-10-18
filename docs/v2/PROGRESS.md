> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

# V2 progress ledger

> Historical V2 checkpoints. Earlier pending/debugging notes are not current outstanding work. Read the [current Android guide](../ANDROID.md) or [V2 archive index](README.md).

## Safety / WP-V2.1

- Created `v2` from clean production `0a1334e`; verified `main` reference unchanged.
- Locked install and baseline complete: 96 tests green, typecheck/build green, pre-existing lint 5 errors + 1 warning.
- Audit/design/plan and full owner brief preserved alongside raw baseline logs.
- Ruling: implement inline under the owner's explicit instruction to audit then build completely; avoid repetitive approvals from general skill defaults. No worktree needed: requested `v2` branch in this checkout provides the chosen isolation.
- Ruling: keep explicit persistence with clear dirty/saved state and navigation guards; defer autosave state/accounting policy for owner discussion. Fix mark-settled stale-record issue.
- Pending: running-app visual baseline, foundation, all feature passes, compatibility/PWA/browser evidence and final independent review.

## Foundation and workflows / WP-V2.2–7

- Replaced all accumulated presentation CSS with coherent tokens, responsive layouts, a desktop sidebar and four mobile destinations. Home now displays real recent data.
- Simplified new bill (optional title, no duplicate summary), preserved group selection/identity, moved optional personalization behind disclosure.
- Extracted item assignment with native dialog focus/Escape behavior, ReviewPeople breakdowns, GroupDetail/Members/Activity/Balances/Stats/Issues, BackupPanel and shared useBillEditor.
- Explicit save status, dirty navigation/unload guard, atomic expected-revision saves, errors preserving edits, latest-payment settlement and stale-tab protection implemented.
- Browser found and fixed own navigation race: save completion must authorize navigation before awaiting React's state render; edit-version check prevents leaving with newer unsaved edits.
- Browser found pre-existing decimal typing bug (10.01 became 101); shared DecimalInput/MoneyInput preserves separators until blur. Tests now use keystrokes, not only fill().
- Actual malformed backup test exposed accepted null/nested invalid records; structural validation now rejects before writes while retaining unfinished drafts and legacy import.
- Actual imported multiple-payment test exposed multiplying entered totals. Narrow upsert fix collapses that person's ledger entries to the new entered total, preserving first ID/note and other payers. All original financial tests and 12 portable golden fixtures remain green.
- 121 tests passed before adding final payment/worker lifecycle cases; latest focused runs green. Typecheck/lint clean.
- Real browser pass: creation, dirty navigation, dialog focus/Escape, cent remainder, edited-payment settlement/reload, group archive/restore/preselection/identity, 630→630000 LBP, export + duplicate import. Seven widths320/360/390/412/768/1280/1600, 7 workflow routes plus group sections: no document overflow. Axe clean Home/New/Assignment/Review/History. No runtime errors. Screenshots output/playwright; results JSON retained there.

## PWA / WP-V2.8 in progress

- Build plugin fingerprints final shell and worker; atomic shell fetch/validation, build caches, cached navigation fallback, explicit waiting-worker activation and multi-tab cache retention.
- Production environment gate replaces arbitrary port heuristic; tests cover custom development ports and production on5173.
- Dark manifest/browser chrome and emerald icon variants match app. PNG compression reduced icon bytes. 512 icon marked maskable.
- Latest build JS386.78kB/116.56gzip, CSS24.67kB/5.77gzip (substantial CSS reduction from74.22).
- Production PWA QA uses original V1 build on same local origin, actual V1 UI-created records/group/archived member. That setup passes. First update prompt timed out while worker still installing; diagnosis in progress in scripts/qa-pwa.mjs (server request + cache entries on failure).
- Added/fixed separate registration lifecycle regression: attach state listener to an already installing worker, since updatefound can precede register() resolution. Unit test red→green3/3.

## Final checkpoint / WP-V2.9–10 — complete for owner review

- Independent review2Important+1Minor resolved and rechecked; see REVIEW.md. Per-file precache integrity and all-form/late-activation protection now have executable regressions.
- Locked install190 packages, typecheck/lint clean,123/123tests21files, production build successful. Final CSS25.00kB/5.81gzip, JS388.39/117.06gzip. No weakened/deleted tests.
- All final browser suites pass on Chromium156: responsive7widths,14axechecks0violations, keyboard/decimal/custom/extras/group/error/large/legacy flows, actual V1→V2 exactdata, browserclose/reopenoffline, updates/multitab/failures/mixeddeployments. gzip-served shell verified too.
- Visual inspection covered representative phone/desktop screens and empty/error/large-money states. Exact evidence and acceptance limits in VERIFICATION.md.
- Real generated profiles revealed dev watcher EBUSY and exported V1 source affected tool discovery; ignore only generated output/.playwright-cli for Vite/ESLint and scope Vitest to actual src tests. Dev server subsequently stayed healthy during profile creation. Fresh install required stopping our local servers to release Windows native-binding locks; final install succeeded.
- Root continuity, README, architecture, owner report, scorecard, baseline/final logs and reproduction scripts complete. Immutable verified implementation4270880; documentation afterward does not change built app.
- At the original review checkpoint, v2 was preserved locally with no push/merge/deploy/tag/production config change. Manual physical-device/SR/cross-browser/hosted acceptance remains explicitly unverified.

## Owner-authorized GitHub publication — 2026-10-17

- Owner requested pushing the work to its separate branch. Published `v2` to origin with upstream tracking; application source is unchanged from the verified implementation.
- Remote `main` was already `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064` before publication. No merge, rebase, force push, deployment or production configuration change.
- Updated current README/report/verification/continuity status to record publication; earlier implementation checkpoints remain historical.
