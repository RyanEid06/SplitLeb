> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

# SplitLeb V2 — owner review report

> Historical web/PWA V2 report. Statements about no APK/tag apply to that milestone. Current Android release and verification: [Android guide](../ANDROID.md). See the [archive index](README.md).

The complete Web/PWA V2 pass is implemented on `v2`, with final local verification recorded in [VERIFICATION.md](VERIFICATION.md). It is ready for owner review. **Do not merge or deploy it over production without the owner's decision.**

## Branch

- Branch: `v2`; verified implementation: `4270880e04acf3eba4724336a6d95e8498ce8b92`.
- Local `main`/cached `origin/main`: unchanged at `0a1334ed44cde1ef1cb48550fef18a71356f41e1`. Remote `main` independently advanced to `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064`, observed before the owner-authorized publication of `v2`.
- Logical commits: `56f648f` audit/safety; `6c55952` UI/workflow architecture; `ce5e4bd` PWA lifecycle; `4c60eae` independent-review corrections; `4270880` final edge verification/polish. Later commits are documentation only.
- Published the separate [now-archived V2 source](https://github.com/RyanEid06/SplitLeb/tree/web-v2-before-production-2026-10-18) on 2026-10-17 at the owner's request. No merge, deployment, release tag, Cloudflare change or APK.

## Baseline

The untouched application had 96 passing tests, successful typecheck/build and a substantial financial/storage foundation. Lint had **5 pre-existing errors and 1 warning**. The old Home was decorative, mobile navigation used the desktop sidebar, and several pages exposed implementation jargon. The README was the Vite template.

## Major changes

- Small dark-first design system with restrained emerald accents, lighter typography, tabular money, consistent controls/focus, native disclosures/dialog and reduced-motion support.
- Desktop sidebar plus four mobile bottom destinations and a reachable mobile Review action. Home shows actual groups/recent bills and useful empty states.
- New Bill has optional naming, concise currency/group/people setup and no duplicate summary. Optional personalization is disclosed; old emoji/color data is preserved.
- Receipt allocation has a focused dialog, stable decimal entry and preserved keyboard entry. Review prioritizes people/final balances, with accessible exact breakdowns and appropriate phone layouts.
- Shared bill editing preserves unsaved changes, handles failed/stale writes, prevents competing tabs from overwriting and saves current payments when settling.
- Groups use Activity/Balances/Stats/Members; settings and archived members are disclosed. History/backup is concise and uses readable rows.
- Production PWA caches complete build-matched content, offers safe updates, rejects incomplete/mixed shells and preserves old tabs. Manifest, browser chrome and icons match the dark app.
- Developer-facing copy, decorative glow/grid/gradients, unused assets/components/constants and accumulated responsive CSS were removed. README, architecture, parity fixtures and durable continuity/progress records are in place.

## Files refactored

| Original hotspot | V1 lines | V2 responsibility                                                               |
| ---------------- | -------: | ------------------------------------------------------------------------------- |
| SavedGroupsPage  |    1,425 | Small group chooser; GroupDetail/Members/Activity/Balances/Stats/Issues modules |
| ItemsPanel       |      900 | Receipt entry/list; separate AssignmentPanel and native Dialog                  |
| ReviewPage       |      533 | Review orchestration; ReviewPeople and shared editor                            |
| NewBillPage      |      480 | Simplified setup and existing people editor                                     |
| HistoryPage      |      421 | History rows; separate BackupPanel                                              |

State and calculations were separated by responsibility rather than splitting files into cosmetic wrappers. Assignment and extras remain substantive feature components, with room for future targeted decomposition if they grow.

## Functionality preserved

- USD/LBP, integer-cent arithmetic, k-LBP entry, existing LBP1,000 settlement rounding and tax-included menu assumptions.
- Equal, weighted/shares and custom item allocation, deterministic remainder cents, extras, discounts, totals and detailed calculations.
- Multiple payers, under/overpayment, balances, deterministic transfers and settled/draft/active statuses.
- Saved bills, history, duplication, notes, item metadata and compact/detailed share summaries.
- Saved groups, active/archived/restored members/groups, stable group↔bill identities, historical bills, running balances, stats and settlement suggestions.
- IndexedDB persistence, v1 database upgrade, legacy/current backups, duplicate/conflict behavior and export/import round trips.

Financial algorithms were preserved. One proven payment-editing bug was corrected: multiple imported entries for one person no longer multiply a newly entered total. A failing regression demonstrated the error before the fix; all original tests and 12 portable fixtures pass.

## Tests

Final locked install: **190 packages**. `npm run typecheck`: clean. `npm run lint`: **0 errors/warnings**. `npm run test:run`: **123/123, 21 files**. `npm run build`: success. All original 96 tests are retained, with 27 meaningful additions.

Actual Chromium156 UI workflows, seven responsive widths, 14 axe checks with zero violations, explicit save/navigation/decimal/settlement regressions, large/legacy records, and production PWA lifecycle tests pass. Exact commands and logs are in [VERIFICATION.md](VERIFICATION.md).

## Offline/PWA

Verified first online install, same-origin V1→V2 update, actual browser close/reopen offline, deep links, offline creation/review/groups/history/export, waiting update deferral, late activation, multiple open tabs and failed/inconsistent deployment fallback. The local test server also serves compressed HTML/JS/CSS. Development registration is disabled regardless of port.

## Migration/data safety

No V2 schema change or clearing occurs. Existing database version/name/indexes and backup schemas remain compatible. Real production-UI records, including archive fields, remain unchanged after upgrade. A real v1-store migration and legacy/current backup round trip pass. Structural validation blocks malformed nested imports before writes while allowing unfinished draft splits.

## Visual/UX improvements

Actionable launch screen; cleaner forms; less copy; quieter status; fewer competing actions; social group objects rather than admin tables; touch-sized controls; native modal focus; readable mobile balances; accessible financial detail; coherent dark install visuals. CSS falls from **74.22 to25.00 kB raw** (12.43→5.81 gzip). JavaScript gzip is essentially flat, 116.81→117.06 kB.

## Known issues / acceptance limits

No unresolved Critical/Important independent-review findings remain. All three review findings were fixed and independently rechecked. This is local Chromium proof, not physical-device or all-browser certification. Physical installs, real touch interaction, screen-reader listening, Safari/Firefox, hosted Cloudflare behavior and CI remain unverified. Clipboard availability remains browser-permission dependent, with the existing manual-copy fallback.

## Open product decisions

**Autosave**

- Current: explicit Save, quiet Saved/Unsaved status, protected navigation/update and save-on-review; statuses keep their accounting meaning.
- Option A: retain this model (**recommended for this V2 review**). Clear control and fewer persistence/state races; users still need to save edits.
- Option B: autosave editing drafts, with a separate deliberate active/settled transition. Fewer save actions, but requires a settled policy for incomplete allocations, multi-tab conflicts and which changes count in group accounting.
- Recommendation: decide that state policy before adding autosave. No hidden autosave behavior was introduced to force a product decision.

Dark-first, four destinations, optional bill naming and secondary group stats were implemented as deliberate choices supported by the existing workflows. Light mode remains optional future scope, not a half-finished theme.

## Remaining work to reach 9.5+

1. Owner visual/touch acceptance on real phones, including320px-class layouts and installed app safe areas/keyboards.
2. Real screen-reader review and Safari/Firefox acceptance, especially dialogs, focus, decimal entry and file downloads.
3. Owner-approved hosted preview to verify actual caching headers/origin continuity and OS installation/update experience.
4. A repeatable large-history/item-list performance benchmark before claiming top-tier performance under heavy datasets.
5. Decide whether an autosave state policy is worth the additional complexity.

## Scorecard

These are critical engineering estimates based on the recorded evidence, not measured certification or a claim that manual acceptance is complete.

| Category              |     /10 | Limiting factor                                                        |
| --------------------- | ------: | ---------------------------------------------------------------------- |
| Functionality         |     9.3 | Cross-browser/manual acceptance outstanding                            |
| Financial correctness |     9.5 | Original suite + portable fixtures + corrected payment regression      |
| Desktop UX            |     9.0 | Owner workflow preference review remains                               |
| Mobile UX             |     9.0 | Browser matrix passes; physical touch/install unverified               |
| Visual design         |     9.0 | Coherent complete pass; owner aesthetic acceptance remains             |
| Accessibility         |     8.8 | Axe/keyboard green; no screen-reader listening                         |
| Offline/PWA           |     9.2 | Strong lifecycle proof; hosted/OS install acceptance remains           |
| Data safety           |     9.3 | Upgrade/backup/atomic saves pass; browser eviction remains inherent    |
| Performance           |     8.8 | Much smaller CSS; no heavy-history benchmark                           |
| Maintainability       |     9.0 | Clear feature boundaries; substantive assignment/extras modules remain |
| Overall V2 readiness  | **9.0** | Ready for owner review, with manual release gates still open           |
