# SplitLeb — maintainer continuity

Current Android release work belongs on **`android-app`**, originally created
from V2 at `d465ff0a4cf9dec19b10e7bf33a83cbb75be9622` on 2026-10-17.
Start with [docs/ANDROID.md](docs/ANDROID.md) for current build/signing instructions,
verification, APK hashes and the physical-device checklist. Historical V2 records
are indexed in [docs/v2/README.md](docs/v2/README.md).

## Authorization and boundaries

The owner authorized the Capacitor integration, then reported the original debug
APK working on their phone and accepted the application. They requested a full
mint launcher icon and the first permanently signed public GitHub Release named
**SplitLeb Android 1.0.0**, plus current source/docs on `android-app`.

The owner subsequently authorized the import/storage hotfix and official
Android 1.0.1 update on 2026-10-18. They also approved the web production switch:
`main` now contains completed V2, `v1` archives the original web application,
and `android-app` remains the separate APK implementation. The former `v2`
branch was incorporated into `main` and removed. These are the three branches.
Earlier V2 review-only and main-untouched restrictions describe historical work.

Documentation maintenance is authorized across all three branches. Preserve
their application boundaries, immutable archive/release tags and published APKs.
Web production is [splitleb.pages.dev](https://splitleb.pages.dev/); its current
[continuity guide](https://github.com/RyanEid06/SplitLeb/blob/main/V2-CONTINUITY.md)
records the promotion and web-specific storage recovery behavior.

## Release identity

- Packaged source: `bb7d3dabcc800e5927d764b00d57ad06596b561d`, tagged
  `android-v1.0.1`. Later documentation commits do not change the published APK.
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
