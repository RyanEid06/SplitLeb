# SplitLeb Android 1.0.1

## Release and source

Download [SplitLeb Android 1.0.1](https://github.com/RyanEid06/SplitLeb/releases/tag/android-v1.0.1).
The release contains the signed APK and its SHA-256 checksum.

- Source branch: [`android-app`](https://github.com/RyanEid06/SplitLeb/tree/android-app),
  originally created from V2, `d465ff0a4cf9dec19b10e7bf33a83cbb75be9622`.
- Packaged source: `bb7d3dabcc800e5927d764b00d57ad06596b561d`, tagged
  `android-v1.0.1`; later documentation commits do not change the APK.
- Original 1.0.0 packaged source: `824ca93770f4cf6d6ca485f62772757d404217e2`.
- Release tag: `android-v1.0.1`, on `android-app`.
- Permanent package ID: **`com.splitleb.app`**; app label: **SplitLeb**.
- Android versionName **1.0.1**, versionCode **3**. The web package retains its
  separate `2.0.0-preview.1` version.

The owner reported the original test APK working on their phone on 2026-10-17,
accepted the application, and requested a full mint launcher icon and the first
permanently signed public release. They selected **GitHub Release: Android
1.0.0**, superseding the earlier debug-only signing/publication limit.

The owner requested the backup-import fix and an official 1.0.1 update on
2026-10-18. Install it over the permanently signed 1.0.0 APK using Android's
Update action; the certificate, package ID and storage origin are unchanged.
No uninstall or app-data clearing is needed. IndexedDB v1/v2 upgrades to v3 by
repairing stores/indexes without resetting records. Backup JSON stays schema 2.
See [the regression report](BACKUP-IMPORT-REGRESSION.md) for the reproduction,
atomic merge behavior, error categories and migration tests.

The APK release itself made no hosting or web-branch changes. Subsequently, the
owner promoted V2 to `main` and removed the separate `v2` branch. The three
branches are now `main` (current web/PWA), `v1` (archived original web app), and
`android-app` (APK). [Web production](https://splitleb.pages.dev/) and the APK
have separate local storage and release lifecycles. See the
[web promotion report](https://github.com/RyanEid06/SplitLeb/blob/main/docs/PRODUCTION-PROMOTION.md).

## Architecture

The existing React/TypeScript application remains authoritative. Capacitor
packages Vite's `dist` locally. There is no hosted startup URL or second
implementation. Financial calculations, backup schemas and public artwork are
unchanged. The 1.0.1 import/storage fix migrates `splitleb-local-db` to version 3.

- Native assets load at permanent `https://localhost`, with `webDir: dist`.
  No `server.url`, remote update loader or unrestricted `allowNavigation`.
- Android skips PWA worker registration and browser update prompts. The APK is
  its update unit. Browser caching, integrity checks and dirty-update protection
  remain active. Both platforms retain connectivity feedback.
- No startup/update data clearing. Browser/PWA and Android have separate
  sandboxes; transfer records with backup export/import.
- Back cancels the top dialog first, otherwise uses React Router history with
  existing unsaved-change protection. Cold non-root navigation returns Home;
  Home Back backgrounds the activity.
- Browser exports retain Blob downloads. Android writes JSON to private
  `cache/backups/` and opens the system chooser with a scoped URI. Choose a
  durable destination: a closed chooser does not prove the file was saved.
  Cancellation/ambiguous results do not claim success. Import uses the system
  file picker; no broad or legacy storage permission.
- No external web links were found in product screens. Capacitor's default
  external-navigation handling and the existing web clipboard API are retained.

## Build and development

Verified with Node 24.18.0, npm 11.16.0, JDK 21, SDK platform 36 / Build Tools
35.0.0, Gradle 8.14.3 and Android Gradle Plugin 8.13.0. Minimum API 24; target
API 36. Capacitor core/CLI/Android **8.5.3**, App **8.1.2**, Filesystem **8.1.5**,
Share **8.0.3** are exact-locked. Capacitor 8 requires Node 22+ and Android
Studio 2025.2.1+. Use a current Android System WebView.

Set `ANDROID_HOME` or create ignored `android/local.properties` for your SDK.
Java properties files need escaped Windows drive colons, for example
`sdk.dir=C\:/Android/Sdk`. Never commit local paths or signing material.

```sh
npm ci
npm run android:sync    # production build, then cap sync android
npm run android:open    # Android Studio
npm run android:build   # fresh build + sync + assembleDebug
npm run android:release # Windows: fresh build + sync + signed release + lint
```

Android Studio opens the `android` directory with its normal debug Run/Build
workflow. After web source changes, sync before building. Normal `npm run build`
still produces web/PWA deployment files; hosting configuration is unchanged.

On this machine only, verified Google SDK tools are in ignored
`output/android-sdk`. Java's default Windows temporary directory failed a
standalone Unix-domain socket probe. The session workaround sets two
process-local Java properties; these are not shipped app settings:

```powershell
New-Item -ItemType Directory -Force output/tmp | Out-Null
$javaTemp = (Resolve-Path output/tmp).Path
$env:JAVA_TOOL_OPTIONS = "-Djava.io.tmpdir=$javaTemp -Djdk.net.unixdomain.tmpdir=$javaTemp"
npm run android:release
```

## Permanent signing and debug-to-release migration

The permanent RSA-4096 key is outside the repository in
`C:\Users\Administrator\SplitLeb-Signing`, restricted to the current owner and
SYSTEM. Preserve this directory. It contains `splitleb-release.p12`, encrypted
`credentials.clixml`, public `release-certificate.pem`, and recovery notes.
No private key/password is committed or attached to the release.

`scripts/build-android-release.ps1` defaults to that user-profile directory;
override with `SPLITLEB_SIGNING_DIRECTORY`. It decrypts the credential through
Windows DPAPI, supplies signing inputs in its child process environment, and
restores previous values in `finally`. The credential file works only for the
current Windows user on this machine. An independently recoverable off-machine
backup has **not** been verified. Before Windows migration/reinstallation,
securely back up the keystore and recover its password locally into the owner's
password manager. Never generate a replacement key for an update.

On another machine or CI, securely supply the existing key and process variables
`SPLITLEB_KEYSTORE`, `SPLITLEB_KEY_ALIAS`, `SPLITLEB_STORE_PASSWORD` and
`SPLITLEB_KEY_PASSWORD`. After `npm run android:sync`, run from `android`:
`./gradlew :app:assembleRelease :app:lintRelease` (Windows: `.\gradlew.bat`).
Release APK/AAB packaging fails without signing inputs; the negative check passed.

Public signing certificate SHA-256:
`36e30976995c65997a6b836c7308cd2b241474d5aef81518f86c7ba9140440b2`.
Future releases must keep this key, application ID and origin, with a higher
versionCode. See [Android app signing](https://developer.android.com/studio/publish/app-signing).

**Earlier debug installation:** export a JSON backup to a durable destination
and confirm it exists **before uninstalling**. Android rejects an in-place
update signed with a different key. Uninstall the debug app, install this signed
release, then import the backup. Uninstalling deletes that installation's local
records. Future same-key signed releases can update it in place.

## Native configuration and branding

- Normal permissions: `INTERNET`, `ACCESS_NETWORK_STATE`. Chromium requires
  network state for WebView connectivity events. AndroidX declares/uses
  signature-only `com.splitleb.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
  No sensitive runtime permissions, tracking, analytics, Firebase, accounts or
  remote database.
- MainActivity is exported for launching. AndroidX's exported profile-install
  receiver requires privileged `android.permission.DUMP`. FileProvider and
  AndroidX startup provider are non-exported. FileProvider grants temporary
  access only to `cache/backups/`. Auto Backup and cleartext traffic are disabled.
  Release debugging is disabled; production WebView debugging is not forced.
- Dark `#101714` startup/window background, approved logo splash, light system
  icons, no orientation lock, `adjustResize` keyboard behavior, and Capacitor 8
  SystemBars native inset handling. API 27/29 theme properties are qualified.
- Launcher background is mint **`#A5E6B8`** across the adaptive mask, with the
  approved emblem centered. Legacy icons have proper rounded/circular masks
  and mint backing at five densities. Adaptive artwork uses a 72dp viewport in
  the 108dp layer. `npm run android:icons` regenerates resources from unchanged
  `public/splitleb-logo.png` with Playwright. Web artwork is unchanged.

References: [Capacitor 8 prerequisites](https://capacitorjs.com/docs/updating/8-0),
[configuration](https://capacitorjs.com/docs/config),
[App Back API](https://capacitorjs.com/docs/apis/app),
[Chromium connectivity notifier](https://github.com/chromium/chromium/blob/main/net/android/java/src/org/chromium/net/NetworkChangeNotifierAutoDetect.java).

## Verification of Android 1.0.1

- **160 tests / 26 files** passed, including the unchanged original 18-bill,
  3-group backup; TypeScript and ESLint passed.
- Six import regressions passed against assets extracted from the signed APK
  using the original backup: fresh DB, legacy v1, incomplete v2 stores/indexes,
  post-commit refresh failure and file-read failure. Duplicate/preservation checks
  passed. Five native-shell Chromium checks passed, including offline restart.
- Signed `assembleRelease` and `lintRelease`: **BUILD SUCCESSFUL in 1m 15s**,
  245 tasks (49 executed, 196 up-to-date); lint **0 errors / 8 existing warnings**.
- Binary manifest verifies `com.splitleb.app`, 1.0.1/code 3 (higher than official
  1.0.0/code 2). `apksigner` verifies the same permanent certificate; zip alignment
  passes. The native storage origin remains `https://localhost`.
- All 16 production web assets match the APK by SHA-256. These are local build
  and Chromium checks; physical phone update/import acceptance remains pending.

## Verification of Android 1.0.0 (historical)

Baseline at `d465ff0`: typecheck/lint/build passed, **123 tests / 21 files**.
Final release source: typecheck and ESLint pass (**0 errors, 0 warnings**),
**134 tests / 23 files** pass; production Vite build and Capacitor sync pass.
Unit tests cover native worker isolation, Back routing/dialog cancellation,
backup/cancel/error/ambiguous-share paths, and unchanged browser downloads.

- Chromium 156 workflows passed all **7 widths** (320, 360, 390, 412, 768, 1280,
  1600), with **14 axe checks / 0 violations**. Financial edge cases, backup
  roundtrip and dirty navigation passed. `qa:unsaved` passed.
- `qa:prepare-v1` and all **6 `qa:pwa` scenarios** passed: actual legacy-data
  upgrade, browser close/reopen offline, dirty updates, multiple tabs and
  incomplete/mixed-asset rejection.
- Final `qa:android-shell`: **5 checks passed** against packaged assets: offline
  native cold load without worker/cache/update UI, real router unsaved cancel,
  dialog Back cancel, IndexedDB across full browser restart offline, and Home
  minimization. Chromium uses a mocked Android bridge; this is not WebView or
  device execution.
- `assembleDebug`: **BUILD SUCCESSFUL**, 184 tasks executed. Follow-up
  `assembleDebug lintDebug assembleDebugAndroidTest`: **BUILD SUCCESSFUL**,
  271 tasks, lint **0 errors / 9 warnings**. Instrumentation compiled but was
  not executed without an attached device/emulator.
- `npm run android:release`: **BUILD SUCCESSFUL in 3m 40s**, 245 tasks
  (235 executed, 10 up-to-date). Includes fresh build/sync, signed
  `:app:assembleRelease` and `:app:lintRelease`.
- Release Android lint: **0 errors / 8 warnings**: Gradle update advisory,
  Android 12 extraction-rules suggestion, four generated unused resources, and
  two optional monochrome/themed-icon tags. No baseline or suppression added.
- Missing-key release packaging fails as required. `apksigner` verifies v2
  signing against the permanent public certificate. `zipalign -c -P 16 -v 4`
  passes. Binary manifest confirms package/version/API levels, non-debug release,
  permissions/provider scope and disabled backup/cleartext.
- All **16 `dist` files** SHA-256 match APK `assets/public/`. Packaged Capacitor
  config confirms local origin and no remote URL/navigation override.

Native lint errors were corrected with API-qualified themes and escaped local
SDK properties. Generated build/asset copies are excluded from ESLint without
weakening app rules. Integration review findings were fixed (network-state
permission and real package/label instrumentation assertion). Final GPT-6.1
Sol/high release review found no Critical/Important code issues; outdated
debug-only documentation was corrected.

Logs/inspection: ignored `output/android-qa/`; browser reports:
`output/playwright/`. These are local checks, not GitHub Actions/emulator proof;
no CI workflow was added. The owner reported overall phone acceptance of the
**earlier debug APK**. The agent did not operate the phone or individually
certify the checklist below.

## Signed APK

- Filename: `SplitLeb-Android-1.0.1.apk`.
- Canonical output: `android/app/build/outputs/apk/release/app-release.apk`.
- Desktop: `C:\Users\Administrator\Desktop\SplitLeb-Android-1.0.1.apk` (hash verified).
- Size: **5,859,252 bytes** (5.59 MiB).
- SHA-256: `da80d2e8ee6302ca1b5cfc0b53a5ed855d3f1b15a7b631af2680bd190e87484c`.
- Signer: `CN=SplitLeb, O=SplitLeb, C=LB`, RSA-4096; certificate fingerprint above.
- Release assets: APK plus `SplitLeb-Android-1.0.1.apk.sha256`.

Historical phone-test artifact, retained separately on Desktop:
`SplitLeb-Android-Test.apk`, **6,852,925 bytes**, source `112f954`, versionName
`2.0.0-preview.1` / code 1, debug-signed. SHA-256:
`d889faae4132595fabde40d8d728c321827569d9edf58dfa70b4fa033e736a07`.
It is not the public release asset. The canonical debug output may be replaced
by later builds; the historical Desktop copy was preserved.

## Physical-device follow-up

**PHYSICAL DEVICE QA REQUIRED** for the final signed/icon-changed artifact.
Owner overall acceptance is recorded above; individual items remain unreported:

- [ ] Update official signed 1.0.0 in place, retain data and import the original
  backup; label, full
  mint launcher/recent-app icon and splash without white/placeholder flashes.
- [ ] Home/navigation; new group and USD/LBP bill; save, History, reopen/edit.
- [ ] Force-close/reopen retains records; later same-key update retains data.
- [ ] Airplane-mode cold launch, open records, create/save offline, force-close
  and reopen still offline; reconnect and check banner transitions.
- [ ] Back dismisses dialogs, respects canceled unsaved navigation, backgrounds
  Home; check gesture and three-button navigation.
- [ ] Keyboard/numeric inputs, long forms, dialogs, scrolling and keyboard Back
  keep fields and controls reachable.
- [ ] Export to durable storage, inspect/reimport JSON, cancel without data loss;
  system picker, duplicate/conflict handling and PWA-to-Android backup transfer.
- [ ] Status/navigation bars, cutouts/gesture area, rotation/landscape, no crashes.

Remaining owner actions: confirm the final icon/signed build on the phone and
keep a securely recoverable backup of the permanent signing identity.
