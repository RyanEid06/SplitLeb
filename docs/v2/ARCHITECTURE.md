> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

# SplitLeb V2 architecture

## Boundaries

React and React Router remain the presentation layer. `src/domain/bill` and `src/domain/groups` own calculations. UI components call these functions and never compute currency conversions or settlement arithmetic independently. `src/storage` owns IndexedDB and backup contracts. No server, identity provider, remote database or analytics is involved.

`AppLayout` owns the single main landmark, navigation, route focus and single router blocker. Phones use four bottom destinations, plus a reachable Review action in the bill workspace. Desktop uses a persistent sidebar. Styles are divided by responsibility with shared tokens in `styles/base.css`.

## Editing

`useBillEditor` loads with `getBill` without rewriting stored records. It keeps the persisted revision and current edited snapshot separate. Explicit saves use `saveBillEdits`, whose single readwrite transaction compares `updatedAt`, writes current values and advances the revision monotonically. Concurrent saves of one revision cannot both succeed. A deleted bill is not resurrected. New edits arriving during a write remain separate from the saved snapshot.

`unsavedChanges` aggregates dirty owners, including unfinished setup, person, item and group forms. It protects navigation/unload and feeds the PWA update interface. Successful writes clear only the relevant owner's dirty state. `DecimalInput` preserves the raw decimal separator while focused; `MoneyInput` translates through existing USD/k-LBP parsing, normalizing display on blur.

Draft, active and settled retain their existing storage meanings. “Save bill” promotes a draft to active; “Save as draft” remains available; Review saves without silently changing that state. Mark settled writes the current payment edits and the new status together. Group settlement remains suggested transfers; it does not automatically record money as paid.

## UI responsibilities

- `ItemsPanel`: receipt entry, inline item editing, duplication/deletion. `AssignmentPanel`: equal/shares/custom splits, category/note and allocation preview, presented in a native dialog.
- `ReviewPeople`: per-person total/balance and expandable exact breakdown. Review coordinates the existing review/settlement functions, payments and share summary.
- `SavedGroupsPage`: group creation/selection. `GroupDetail`: section selection, loading and mutation feedback. Members, Activity, Balances, Stats and Issues are coherent feature modules.
- `HistoryPage`: all saved bill summaries and duplicate/delete actions. `BackupPanel`: export/import and optional device-data explanation.

## Data contracts

Database remains `splitleb-local-db`, version **2**, with unchanged stores and indexes. No V2 schema migration or data clearing occurs. The existing v1→v2 database upgrade still creates the group store while preserving bills.

Backup schema 1 contains bills; schema 2 contains bills and groups. Current export remains schema 2. Import preserves duplicate/conflict/reference behavior and uses the existing transaction. Additional structural validation rejects malformed nested objects before writes. It deliberately does not require a draft to pass financial review: unfinished custom allocations remain recoverable.

Financial arithmetic and rounding are preserved. The only calculation-adjacent correction is payment editing: when imported data has several payment entries for one person, entering their new total replaces that person's total once, rather than multiplying it across every old entry. Existing ID/note and other payers are retained.

## Offline lifecycle

The build plugin hashes the worker template and emitted shell files for a build-specific cache. It embeds an exact URL→SHA-256 manifest. Installation fetches and consumes all bodies, validates MIME/content and publishes only matching files. Missing files or HTML from another deployment fail installation and remove only that incomplete new cache.

Navigation uses the active build's cached index. All emitted assets are precached, and old hashed asset caches are retained for other open tabs. Cleanup preserves another recent cache when only one client remains. The worker never calls skipWaiting on install; the user chooses Update. Unsaved forms disable that action; activation rechecks dirty state before reload. A late activation leaves a Refresh action if editing has begun. Production environment gating prevents development registration at every port.

Origin/browser boundaries still apply: data on a preview hostname or another browser is separate. A future owner-approved production deployment must use the existing origin for an in-place upgrade. Browser eviction or clearing site data can remove local records; export remains the backup mechanism.

## Portable parity fixtures

`src/domain/bill/fixtures/golden-bills.json` is plain JSON with bill inputs, exact per-person cents, balances and ordered transfer tuples. Twelve fixtures cover USD remainder/shares/custom/extras/discount, one-cent payer, paid/under/overpaid, LBP entry/rounding/large values and 21 people with duplicate names. Kotlin can consume them later without adopting a new cross-language framework. These fixtures document existing rounding, including independent LBP transfer rounding; do not “correct” their semantics during a UI port.
