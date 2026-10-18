# Backup import regression — 2026-10-18

## Reproduction and root cause

The supplied official Android 1.0.0 APK has SHA-256
`e3f852be1741af41d6430ffef87d77bc07f163a07682bdd3ddee5bcf89463861`.
Its extracted JavaScript uses `splitleb-local-db` version 2. The original
schema-v2 backup (18 bills, 3 groups) has SHA-256
`68b5a66a5bca5bbf41192970a33351d09e525ac9065438d0f30ac7e92d6169cf`.
The backup was read without rewriting it; its personal contents are not committed.

Before changing production code, ran the APK's packaged assets in isolated
Chromium contexts through the actual History file input, File.text(), JSON.parse,
validation and IndexedDB merge. A logging statement was added only to an ignored
extracted copy of the APK's JS catch handler, to expose the swallowed exception.
The APK and backup files were not modified.

| Initial storage | Actual exception / outcome | Records after attempt |
| --- | --- | --- |
| Fresh DB | Success | 18 bills, 3 groups |
| v1 bills store without indexes | `NotFoundError: Failed to execute 'index' on 'IDBObjectStore': The specified index was not found.` | 18 bills, 3 groups |
| v2 bills store, no savedGroups | `NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.` | 0 bills; savedGroups absent |
| v2 both stores, missing indexes | Same index `NotFoundError` | 18 bills, 3 groups |

There are two schema defects. Opening an already-version-2 DB does not run an
upgrade, so a missing savedGroups store stays missing. During an upgrade, indexes
were only created when creating a *new* store; an existing bills/groups store
never had its missing indexes repaired.

There is also a reporting defect: BackupPanel awaited History's refresh inside
the same catch as import. Missing `by-updatedAt` failed that refresh *after the
merge had committed*, falsely telling the user that their valid backup failed.
Neither failure is caused by the supplied backup's validation or JSON.

These exact exceptions were reproduced against controlled legacy schemas. The
phone's live DB was not available, so which of these schema states exists on
that particular phone is not independently established. Chromium APK-asset proof
does not constitute execution in Android WebView or on a physical device.

## Repair behavior

- DB version increases from 2 to **3**; JSON backup schema remains **2** with v1
  import support unchanged.
- The version-change transaction creates absent stores and absent required
  indexes. An incorrectly configured known index is rebuilt with its expected
  keyPath/non-unique/non-multiEntry definition. Index rebuilding does not rewrite
  bill/group records. Valid existing stores, records and unrelated indexes remain.
- No database/store deletion, reset, app-data clearing or uninstall. An unknown
  store primary-key layout aborts migration without changing the old version or
  records, rather than destroying the store to force compatibility.
- A blocked upgrade reports a recoverable storage error with close-other-windows
  guidance. Failed opens can retry. An abandoned native open closes its late
  connection. New app connections close on versionchange to permit future upgrades.
- Existing-group reads, conflict/reference checks and writes share one readwrite
  transaction. Duplicate records retain local copies. All write failures,
  including synchronous structured-clone failures, explicitly abort the merge;
  transaction completion/abort rejections are consumed.
- File-read, malformed JSON, unsupported schema, invalid backup/bill/group,
  missing relationship, group conflict, database/schema and transaction failures
  have typed categories, friendly messages, and console diagnostics containing
  category/native exception names without personal backup contents.
- A refresh failure after commit reports that the import succeeded and suggests
  reopening History; it no longer labels the backup invalid.

## Changed files

- `src/storage/db.ts`: migration and connection lifecycle.
- `src/storage/billStorage.ts`: categorized validation and atomic merge/rollback.
- `src/storage/backupImportError.ts`: typed errors, user messages and safe reporting.
- `src/features/backup/importBackupFile.ts`: separately categorized reading/parsing.
- `src/features/backup/BackupPanel.tsx`: use the pipeline; separate refresh failure.
- `src/storage/fixtures/fullBackup.ts`: synthetic full 18-bill/3-group fixture,
  USD/LBP, all statuses, archived members, three split methods, extras and payments.
- `src/storage/backupImportRegression.test.ts`: real IndexedDB behavior, legacy
  migration, data preservation, duplicate handling, invalid inputs/relationships,
  conflicts, failed open/retry, blocked connections, future versionchange, unsafe
  primary-key refusal, clone/request failure rollback, optional unchanged real file.
- `src/features/backup/importBackupFile.test.ts`: actual File reading and failures,
  malformed JSON versus unsupported schema.
- `src/storage/backupImportError.test.ts`: classified diagnostics without private data.
- `src/storage/dbMigration.test.ts`: expected migrated version 3.
- `src/storage/billStorage.test.ts`: adapt store test double to transactional reads.
- `scripts/qa-backup-import.mjs`: repeatable production-asset browser regressions.
- This report and `docs/superpowers/plans/2026-10-18-backup-import.md`.

No dependency, backup-format, hosting, product-feature, layout, signing identity,
Android application ID/origin or V2-branch changes were made. The fix was prepared
on `android-app`, based on `74e29bc`. The owner subsequently authorized pushing
the fix and an official 1.0.1 update (Android versionCode 3), using the existing
signing identity and an in-place update from official 1.0.0.

## Verification

- Baseline: **134 tests / 23 files** passed. New migration/rollback/category
  tests were observed failing before their corresponding fixes. Missing-store
  and missing-index failures matched the original APK reproduction.
- Final: **160 tests / 26 files passed**, including acceptance of the unchanged
  original backup via `SPLITLEB_REAL_BACKUP`. Without that optional private path,
  the suite runs 159 tests and skips only the private-file acceptance case.
- `npm run typecheck`, `npm run lint`, and `git diff --check`: passed.
- Six Chromium scenarios passed using the synthetic fixture and again using the
  original backup against assets extracted from the final signed APK: fresh DB,
  v1 bills-only, v2 bills-only, v2 missing indexes, post-commit refresh failure,
  and file-read failure. Successful cases also reimported and skipped all 21
  duplicates; legacy cases preserved independently seeded existing records.
- Independent code review found one blocked-open issue; its regression initially
  timed out, then passed after the fix. Follow-up review verified retry and that
  the abandoned connection does not block a subsequent upgrade. No remaining
  actionable findings were reported.
- `npm run android:release`: **BUILD SUCCESSFUL in 1m 8s**, 245 tasks
  (41 executed, 204 up-to-date), including fresh production Vite build,
  Capacitor sync, `:app:assembleRelease` and `:app:lintRelease`.
- Android lint: **0 errors, 8 existing warnings**. `apksigner verify` passed with
  permanent certificate SHA-256
  `36e30976995c65997a6b836c7308cd2b241474d5aef81518f86c7ba9140440b2`.
  `zipalign -c -P 16 4` passed.
- All **16** production `dist` files match the final APK's extracted web assets
  byte-for-byte by SHA-256. The original backup's SHA-256 remained unchanged.

Initial pre-version-bump verification output: `android/app/build/outputs/apk/release/app-release.apk`,
**5,859,252 bytes**, SHA-256
`f63f67efb2bec3902fc9573b8850124ac16678832674394d405bb2ae9a0381d2`.
This historical candidate used 1.0.0/code 2 and was not published. The official
1.0.1/code 3 output and checksum are documented in ANDROID.md and the
`android-v1.0.1` GitHub release. No installation or physical-device acceptance
was performed.

Local evidence is in ignored `output/import-investigation/`, including
`original-apk-reproduction.jsonl`, extracted APK assets and `android-release.log`.
Initial test execution needed TEMP/TMP under the workspace because the sandbox's
default temp rename failed. Gradle needed authorized access to the existing
user cache; the successful build used the existing release helper/key and the
documented local Java temporary-directory settings. No build settings were weakened.

To repeat the suite on this Windows environment:

```powershell
$env:TEMP = Join-Path $PWD 'output/tmp'
$env:TMP = $env:TEMP
# Optional: point SPLITLEB_REAL_BACKUP at the original private JSON file.
npm run test:run
npm run typecheck
npm run lint
# Point PLAYWRIGHT_BROWSERS_PATH at the installed browser cache if needed.
node scripts/qa-backup-import.mjs
# Or pass the original backup path as the first argument.
```
