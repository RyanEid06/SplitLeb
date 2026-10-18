# SplitLeb — maintainer continuity

Current Android release work belongs on **`android-app`**, created from latest
remote `v2` at `d465ff0a4cf9dec19b10e7bf33a83cbb75be9622` on 2026-10-17.
Start with [docs/ANDROID.md](docs/ANDROID.md) for current build/signing instructions,
verification, APK hashes and the physical-device checklist. Historical V2 records
are indexed in [docs/v2/README.md](docs/v2/README.md).

## Authorization and boundaries

The owner authorized the Capacitor integration, then reported the original debug
APK working on their phone and accepted the application. They requested a full
mint launcher icon and the first permanently signed public GitHub Release named
**SplitLeb Android 1.0.0**, plus current source/docs on `android-app`.

Do not merge, force-push, rename/delete branches, change hosting, or modify
`main`/`v2`. Local `main` remains `0a1334ed44cde1ef1cb48550fef18a71356f41e1`;
remote `main` was already `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064` before Android.
The earlier V2 brief's web-only limits describe that historical milestone;
the later Android/release authorization supersedes those limits for this branch.

## Release identity

- Packaged source: the commit tagged `android-v1.0.1` on `android-app`.
- Tag: `android-v1.0.1`; backup-import/storage hotfix authorized 2026-10-18.
- Android versionName `1.0.1`, versionCode `3`; web version stays `2.0.0-preview.1`.
- Permanent application ID `com.splitleb.app`; native origin `https://localhost`.
- Permanent key lives outside the checkout in the owner's `SplitLeb-Signing`
  directory. Preserve it. Windows DPAPI credentials are user/machine-bound;
  an off-machine recoverable backup still needs owner verification.
- Desktop signed APK: `C:\Users\Administrator\Desktop\SplitLeb-Android-1.0.1.apk`.
  Earlier `SplitLeb-Android-Test.apk` is retained separately and debug-signed.

## Preserve these properties

- React remains the single app implementation; no financial/domain or public
  artwork changes. Storage/import changes are limited to the authorized hotfix.
- Database `splitleb-local-db` migrates to version 3, repairing missing stores
  and indexes without deleting records. Backup schemas 1/2 are retained.
  No startup/update clearing. Same-key updates keep package/origin stable.
- Android packages local assets, skips PWA worker/update UI, and keeps connectivity
  feedback. Browser PWA update integrity and dirty-state protections remain.
- Back respects dialogs and unsaved Router navigation. Backup chooser closure
  does not imply the destination saved a file. Private cache is not a backup.
- No credentials, SDK paths, generated web copies or build outputs in Git.

## Verified and remaining

The 1.0.1 hotfix passes TypeScript/ESLint and **160 tests / 26 files**, including
the unchanged original 18-bill/3-group backup. Six production-asset Chromium
import scenarios cover legacy schemas, preserved records, duplicates, file-read
failure and post-commit refresh failure. Atomic rollback, invalid backups and
blocked-upgrade retry have automated coverage. See docs/BACKUP-IMPORT-REGRESSION.md
and docs/ANDROID.md for build/signature proof and historical web/PWA checks.

The owner accepted the earlier debug build overall. The agent did not operate a
phone; signed-release phone checks remain distinct. Official signed 1.0.0 users
install 1.0.1 in place with Update and keep data. Earlier debug users still need
to export/verify a backup before the separate debug-to-release migration.
Do not claim individual device checks, emulator execution or GitHub CI ran.

No persistent automation was created. No global memories should be written
without an explicit owner request. Keep this file concise; historical debug
iterations and completed V2 implementation logs are not current pending work.
