# SplitLeb V2 — resume here

Read this file first after any context reset, then docs/v2/PROGRESS.md and PLAN.md. Update this at every meaningful checkpoint. Preserve discoveries and unresolved leads, not private reasoning transcripts.

## CURRENT STATUS — finished for owner review

- Branding-only follow-up, 2026-10-17: owner authorized replacing the old SL mark/favicon/PWA icons with Downloads `ChatGPT Image Oct 17, 2026, 01_24_03 PM.png`, then committing/pushing only `v2`. Master copied byte-for-byte to public/splitleb-logo.png. Generated transparent 32px favicon, 192/512px icons and separate dark-background 512px maskable icon (complete mark inside 40% radius safe zone); existing Apple touch link reuses 192px. Updated existing generator to derive assets from this master using the existing Playwright dependency; removed unused old SVG. Desktop mark retains 40x42 slot/object-fit contain; mobile mark 24px beside existing text. Navigation and service-worker behavior unchanged; build automatically precaches all new assets. Fresh build/TypeScript/lint and 123/123 tests pass; Chromium 1440/390/320px screenshots inspected, icons decode correctly, no 404/browser errors, all branding assets cached and usable after offline reload. Evidence/scripts in ignored output/playwright/branding and output/playwright/qa-branding.mjs. Local main still 0a1334e; remote main observed e0ccf806 before this update. Earlier implementation results below describe the pre-branding baseline.
- Implementation is complete on `v2`, verified source `4270880e04acf3eba4724336a6d95e8498ce8b92`. Later changes are documentation only. Owner requested publication on 2026-10-17; `v2` was pushed to https://github.com/RyanEid06/SplitLeb/tree/v2 with upstream tracking. Local main remains `0a1334ed44cde1ef1cb48550fef18a71356f41e1`; remote main independently advanced to `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064` before publication. NEVER merge or deploy without the owner's decision.
- Read docs/v2/FINAL-REPORT.md and VERIFICATION.md for authoritative final results. Older checkpoint sections below are historical, not current pending work.
- Fresh locked install190 packages; typecheck clean; lint0/0;123tests/21files green; production build success. Final bundle CSS25.00kB/5.81gzip, JS388.39/117.06gzip.
- Final Chromium156.0.8078.4 UI suite,7widths,14axechecks0violations,21people/largeLBP/legacybackup/custominvalid/decimal/keyboard/archives/settlement all PASS. Actual V1 UI records→V2 exactfield preservation; persistent browser close/reopen offline and create/groups/review/history/export PASS. Compressed shell, waiting/late/failed/mixed updates and multiple tabs PASS.
- Independent reviewer accepted/resolved all2Important+1Minor findings; focused recheck at4c60eae, detailed docs/v2/REVIEW.md. Subsequent changes: responsive spacing, grammar, screenshots and dev artifact-watch isolation, all locally verified.
- PWA install stall was fixed by consuming fetch bodies before collecting responses. Per-file SHA256 prevents deployment races. Aggregate unsaved state covers all local forms; late activation rechecks it. Keep these safety properties.
- Final install first encountered a Windows native-binding lock from our running preview; stopping own servers freed it and npmci succeeded. Generated browser profiles also exposed a Vite EBUSY watch failure; output/.playwright-cli now excluded from watching/lint/test discovery. Dev server verified stable while final profiles were created.
- Current preview: http://127.0.0.1:4173. Screenshots/resultJSON/isolated profiles preserved in ignored output/playwright. Reproduce with README commands; prepare-v1-qa uses gitarchive and never checks out main.
- No persistent automation, APK, backend, AI/account/tracking, release tag or production config change. Only the separate `v2` branch was pushed.
- Open owner decision: explicit save vs autosave state policy (recommend explicit for this review). Dark-first/four destinations/optional naming are implemented choices.
- Remaining acceptance: actual phone install/touch, screen-reader listening, Safari/Firefox, owner-approved hosted preview, heavy-history performance benchmark. These are candid limits, not unfinished page redesigns.
- User explicitly requested this root Markdown continuity file. Preserve/update it for follow-up work; do not write global memories without explicit authorization.

## Owner authorization and hard boundaries

- Fully implement the attached owner brief, preserved at docs/v2/OWNER-BRIEF.md. Work continuously inline until complete; final full report required.
- All work on branch `v2`. Production `main`/`origin/main` originally `0a1334ed44cde1ef1cb48550fef18a71356f41e1`. NEVER merge, deploy, force push, rewrite main or change Cloudflare hosting. Follow-up explicitly authorized pushing the separate `v2` branch.
- Preserve financial domain, database `splitleb-local-db` version 2, backups schema 1/2, IDs and archived states. No AI, accounts, backend, Android or framework replacement.
- User additionally asked for durable Markdown continuity in this folder. This file fulfills that request; keep it current.

## Verified baseline / current state

- Initially clean main; created v2 with elevated git (sandbox denies writes to .git). First commit `56f648f`: audit/design/plan/owner brief.
- Locked npm ci succeeded outside sandbox (184 packages). Baseline: 96/96 tests, 15 files; tsc -b clean; build JS 394.62 kB / 116.81 gzip, CSS 74.22 / 12.43 gzip.
- PRE-EXISTING lint: 5 errors + 1 warning (set-state-in-effect in Workspace, History, Review, Groups twice; Groups exhaustive-deps). Do not weaken lint/tests to hide them.
- Sandbox Vitest fails EPERM renaming temp files; use approved elevated `npm run` for actual checks. Default-shell command exit may be masked by later Get-Content; inspect logs explicitly.
- Added development test tools `playwright`, `fake-indexeddb`, `@axe-core/playwright`; locked installation succeeded. Package files uncommitted.
- Real browser baseline inspected Home + New Bill at 390px; CLI session `splitleb`, local dev server http://127.0.0.1:5174 (elevated server session 51803). Original sandbox server 5173 session 15244 is unreachable from elevated browser. Browser screenshots/snapshots .playwright-cli/. Ignored artifacts output/.
- Original production build copied to ignored `output/playwright/v1-dist` BEFORE source edits, for V1→V2 same-origin browser upgrade proof.
- Tests-first: added src/storage/billEdits.test.ts with 5 cases: settle current payments, reject stale tab, concurrent save only once, prevent deleted resurrection, preserve explicit draft/active status. Ran RED: missing billEdits module. Implementation still pending.
- A tool patch intended to add billEdits.ts, Icon, Avatar, AppLayout and Home FAILED atomically because delete+add same path not allowed in one apply_patch. Those product files ARE NOT CHANGED. Reapply using Update File or safe Set-Content.

## Evidence-led design decisions

- Dark-first, restrained emerald, system typography, tabular money; replace 4,700+ accumulated CSS lines instead of overriding them.
- Desktop sidebar; four mobile bottom links Home/New bill/Groups/History. One main landmark, skip link, focus after navigation.
- Home: real recent groups and bills + New bill; remove animated hero. New bill: optional title with fallback, people/group, currency, no setup summary; group query preselect.
- Keep explicit Save for this pass, show dirty/saved, prevent accidental navigation. Autosave changes incomplete split and draft/active accounting semantics; document open product decision.
- Confirmed BUG: Workspace/Review Mark settled uses updateBillStatus (reads old storage), losing unsaved screen changes. New atomic saveBillEdits must save current record AND status with expectedUpdatedAt concurrency check in one readwrite transaction.
- Existing openBill reads+puts lastOpenedAt without updating revision; avoid calling it from new editing hook (getBill loads without stale writes). Consider explicit marking lastOpened atomically only if needed.
- New shared useBillEditor: async loading/cancellation, safe save/error state, preserve newer edits during save, expected revision compare, beforeunload and Router blocker; no stale results on billId changes.
- Groups currently 1425 lines; Items 900; Review 533; New Bill 480. Extract coherent GroupMembers/Activity/Balances/Stats and AssignmentPanel etc.
- Preserve money modules exactly; LBP input 630→630000, settlement rounded to 1000 LBP. Core review has net sign differing from settlement balance; use existing settlement helpers, never reinterpret.
- Worker currently hardcoded cache v2, port heuristic and mutable navigation cache; needs build identity, atomic install, waiting update UI, no auto reload while dirty. Keep old asset caches for open old tabs. Manifest background currently light despite dark app.
- Both src/assets/vite.svg and hero.png have no source/public/index references (rg returned none); remove once confirmed build does not use them.

## Workflow / documents

- docs/v2/DESIGN.md: agreed scope inferred from complete owner brief.
- docs/v2/PLAN.md: 6 tasks; inline implementation under owner authorization.
- docs/v2/AUDIT.md: untouched baseline and architecture.
- docs/v2/PROGRESS.md: ledger; append changes/verification/rulings each logical commit.
- Baseline logs currently ignored *.log; convert copies to .txt for committed evidence.
- Skills already read: using-superpowers, brainstorming, writing-plans, using-git-worktrees, executing-plans, test-driven-development, playwright. Owner explicit full implementation overrides repeated skill approval gates. Worktree unnecessary: owner requested v2 in checkout. Inline skill requires one independent reviewer at end (delegation authorized by that skill); no implementation agents spawned.
- Memory search for splitleb had no hits; no relevant memory used/citation needed.

## Next actions

1. Implement/test atomic billEdits.ts; write shared editing hook and behavioral browser regressions.
2. Apply Icon/Avatar, shell, Home, token CSS foundation; inspect screenshots.
3. Simplify New Bill and People; decompose Items; Workspace/Review safe actions and mobile breakdowns.
4. Groups sections, history/backup cleanup, preserve all features; fix pre-existing effects through sound state ownership.
5. PWA lifecycle, build generation, manifest/icons; production offline/update tests.
6. Golden fixtures, real DB migrations and V1→V2 same-origin data tests, responsive 320/360/390/412/768/1280/1600, axe, keyboard, all checks, independent review, commits, full evidence-led final report/scorecard. Never mark goal complete until implementation and required verification really done.

## Checkpoint — presentation pass implemented, 11:48 Beirut

- Product files now changed: token CSS foundations, four-destination shell, recent Home, simplified NewBill, shared useBillEditor, Workspace, ReviewPeople/Review, item assignment native dialog and extracted AssignmentPanel, Groups decomposed into GroupDetail/Members/Activity/Balances/Stats/Issues, History and BackupPanel.
- Atomic billEdits implementation passes all five new tests; full suite 101/101. Latest tsc -b and lint pass with zero diagnostics (pre-existing lint fixed through page restructuring).
- All CSS except none? workspace/extras/review/groups/history now replaced too; NewBill CSS replaced. Home screenshot inspected at390: coherent dark/emerald phone nav.
- Scripts/qa-browser.mjs created with real UI flow, dirty navigation, focus/escape, cent remainder, settle edited payments, archive/restore, group query selection, LBP, export/import, responsive7 widths and axe checks. First attempt blocked on missing Playwright browser revision1248; installing with npx playwright install chromium (latest tool result has process session if ongoing).
- Python WindowsApps alias does not work. Use bundled executable C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe. Failed first extraction was recovered using git show main:ItemsPanel.tsx; AssignmentPanel is correctly created and typechecks.
- Still pending: actual browser QA/fixes, PWA entire pass, golden fixtures/migrations/upgrade tests, robust state edge cases (current bill unavailable/route transitions), independent review and commits. Mark-settled regression fixed in code; needs browser proof.

## Checkpoint — browser pass green, production PWA debugging, 12:01 Beirut

- ALL browser workflow/7-width checks passed, axe clean5 screens, no runtime errors. Mark-settled latest payment proven across reload. Decimal typing actually regressed under original controlled formatting; test using pressSequentially reproduced101 instead of10.01, then DecimalInput/MoneyInput fix passed. Read docs/v2/PROGRESS.md for detailed confirmed findings.
- Added12 portable golden fixtures (JSON) and real fake-IDB v1→v2 migration test. Legacy backup real DB roundtrip and malformed nested records tests red→green. Added narrow financial BUG fix: upsertPaymentForPerson previously multiplied total for multiple imported payments; red1000 vs expected500, now collapse first existing ID/note, other payers kept. Original engine algorithms remain intact. Payment UI now aggregates imported payments.
- Product code formatted with dev-only prettier; TS/lint clean. Current counts: SavedGroupsPage142, Items269 + Assignment408, Review193, New255, Workspace183; coherent feature boundaries.
- PWA implemented in public/sw.js template, vite.config.ts build plugin, registration/PwaStatus. Theme/icons updated. New mobile Review toolbar added; need final browser rerun after this last change.
- scripts/qa-pwa.mjs local dynamic server tests true production V1 build→V2 same origin, persistent browser close/reopen offline, update while dirty, multiple tabs, incomplete update. Actual V1 UI setup green, next waiting-worker step timed out twice. Diagnostic showed new worker still installing, activeV1, new cache open; added detailed request/cache-entry evidence to catch.
- Worker registration separate race fixed+tested: updatefound may happen before register promise resolves; now watch registration.installing immediately too. Latest PWA QA is running session88963 after current build; check its output. Previous failures sessions67486/36963 closed.
- Browser install chromium1248 download is slow30% in session96158. All QA runs currently use existing chromium1243 via env PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe. This env supported in both scripts. Script uses repository playwright driver. Do not pretend1248 was used until actually installed/run.
- Current baseline logs now copied to tracked docs/v2/*.txt. No commits after56f648f yet; must logically commit substantial work soon.
- Pending: solve PWA install, expand UI split/extras/long names/20+ people/group axes and malformed backup UI evidence, document known limitations and open autosave/theme choices, dead assets removal, final full checks and independent reviewer (skill-authorized), final report/scorecard, main safety proof. All work staysv2.

## Checkpoint — review corrections and final verification, 12:15 Beirut

- Commits:56f648f audit,6c55952 responsive workflows,ce5e4bd atomic PWA. Main still unchanged. Several review fixes are currently uncommitted.
- PWA install stall ROOT CAUSE: unread fetch responses in Promise.all exhausted browser connection pool; consume arrayBuffer inside each fetch before collecting responses. Fixed; true V1→V2 same-origin exact records, offline persistent browser close/reopen + all workflows, dirty update deferral, multitab retention and incomplete-update fallback all PASS.
- Independent reviewer /root/v2_review read pinned0a1334e..ce5e4bd, returned2Important+1Minor. Accepted all:1 shell needs per-file content digests to reject mixed-deploymentHTML;2 unsaved quick-entry/setup forms and late activation interval weren't protected;3 failed add-member cleared typedname.
- Corrections implemented: per-file SHA256 precache digests generated in viteplugin, verified workerbody; browser mixedHTML test passes. Shared aggregated unsavedChanges registry/hook covers bill, NewBill, PeopleEditor typedname, Items quickdraft, group create/member/rename; AppLayout owns single router blocker. PwaStatus uses store, rechecks at controllerchange, removes timeoutlisteners and offers laterRefresh; genuine first install avoids fakeupdateprompt. Browser qa-unsaved.mjs RED→GREEN for setup/person/unaddeditem and typing duringactivation. Group run returnsboolean; failedinput retained + newerinput preserved, duplicateerror plainusercopy. Added regression in qa-browser.
- Expanded browser edge pass already GREEN before last cosmetic changes: fractionalshares, invalidcustomblocksreview, tip+discount UI; all7widths; groupfoursections axe; legacyimport21people duplicatedisplaynames+longnames+largeLBP+onecent at320/390/1280, unknownroute/missingbill errors, no runtimeerrors.
- Native labels split method and bill note now explicit htmlFor/id: nested select/textarea labels contained value/options and exact-label browser controls were unstable.
- Default newperson avatars now initials (emoji remains optional and preserved for olddata).
- Removed verifiedunused src/assets/vite.svg,hero.png,StatCard.tsx,constants/currencies.ts,public/favicon.svg,public/icons.svg. Verified no references before exact-file deletes; no recursive cleanup.
- Matching Chrome156/Playwrightchromium1248 full browser downloaded; final scripts use env path .../chromium-1248/chrome-win64/chrome.exe. Background installsession96158 still downloading optionalheadlessshell; final runs fullchrome path work regardless. Earlierresults used1243, laterfullQAused1248.
- New reproducible scripts/prepare-v1-qa.mjs reconstructs pinnedproduction with gitarchive insideoutputwithoutcheckout, builds originalV1dist. Verified exact originalJS/CSShashes matchbaseline. npmcommands qa:prepare-v1,qa:browser,qa:pwa,qa:unsaved.
- Production preview running http://127.0.0.1:4173 session39012. Olddev5174 stopped/refused; qa-browser must pass4173 URL. PWA script serves its ownlocalrandomport.
- Latest commandrunning: formatter +typecheck+lint+alltests+build (check lasttoolsession). Need run final 3browser scripts against rebuiltpreview, final lockedinstall ifdesired, docsREADME/architecture/verification/finalreport+scorecard, finalindependentrecheck fixes (followup reviewer, no need newspawn), commit, cleanstatus+mainSHAproof. 123tests lastfullPASS.
