# SplitLeb Android test milestone

## Scope and architecture

Owner-authorized implementation on `android-app`, based on remote `v2`
`d465ff0a4cf9dec19b10e7bf33a83cbb75be9622` (verified 2026-10-17).
Do not merge, deploy, tag, rename/delete branches or change `main`/`v2`.
The existing React/TypeScript application is authoritative. Capacitor packages
Vite's `dist` locally; there is no hosted startup URL or second implementation.
Keep financial code, database `splitleb-local-db` version 2, backup schema and
existing web/PWA behavior. Android uses APK updates rather than a service worker.

No existing permanent Android ID was found. Use permanent ID `com.splitleb.app`
and label `SplitLeb`. Translate canonical web version `2.0.0-preview.1` to Android
versionName `2.0.0-preview.1`, initial versionCode `1`. This is a debug/test
milestone, not a production release. No permanent signing key is authorized.

## Implementation plan and evidence ledger

- [x] Audit current V2 docs, clean status, source commit and environment.
- [x] Verify baseline: TypeScript/lint/build pass; 123 tests in 21 files pass.
  Restricted sandbox blocks Vitest temp renames; rerun outside it passed.
- [x] Create `android-app` from latest verified `v2`; retain other branch refs.
- [x] Generate Capacitor Android with current stable compatible packages.
- [x] Isolate native worker/update behavior; preserve connectivity feedback.
- [x] Verify router/Back/dirty forms; add only necessary native handling.
- [x] Supply reliable Android backup export without broad storage permissions;
  retain standard file-input import and unchanged browser export.
- [x] Derive launcher/adaptive/splash resources from approved repository artwork;
  configure dark startup, insets, keyboard resize and minimal permissions.
- [ ] Run web checks and browser/PWA regressions; sync/build/lint Android; inspect
  APK contents/signature/manifest and test locally on emulator if available.
- [ ] Record exact evidence, copy verified APK to Desktop, commit and push.

Review focus: cold offline startup, persistence after force-stop/update,
unsaved Back navigation/dialog dismissal, backup cancellation and keyboard/insets.
Physical-phone acceptance remains a separate owner checklist.

## Current environment

Node 24.18.0, npm 11.16.0, JDK 21. Capacitor core/CLI/Android **8.5.3**,
App **8.1.2**, Filesystem **8.1.5**, Share **8.0.3**, all exact-locked. Registry
stable versions and official Capacitor 8 documentation were checked before use.
Android SDK 36 / Build Tools 35.0.0, Gradle 8.14.3, Android Gradle Plugin 8.13.0;
minimum Android API 24. Use a current Android System WebView. Android Studio
2025.2.1 or newer is the Capacitor 8 prerequisite.

The previously recorded SDK path is absent on this machine. Official command
tools are being installed into ignored `output/android-sdk`; `local.properties`
is ignored. No machine-wide environment setting is changed.

Java's default Windows temporary directory caused `Selector.open()` and Gradle
to fail with Unix-domain `Invalid argument: connect`. A standalone probe fails
there and passes with both `java.io.tmpdir` and `jdk.net.unixdomain.tmpdir` set
to ignored `output/tmp`. Builds in this session use those process-local Java
properties. This is an environment workaround, not a shipped app setting.

## Build workflow

Install Node 22+ (verified Node 24), JDK 21, SDK platform 36 and Build Tools
35.0.0. Set `ANDROID_HOME` or create ignored `android/local.properties` with
`sdk.dir` pointing to your own SDK. Do not commit absolute paths.

```sh
npm ci
npm run android:sync   # production Vite build, then cap sync android
npm run android:open   # open generated project in Android Studio
npm run android:build  # rebuild + sync + Gradle assembleDebug
```

Or, after syncing, run `android/gradlew assembleDebug` (Windows:
`cd android` then `.\gradlew.bat assembleDebug`). Android Studio can open the
`android` directory and use its normal debug Run/Build workflow. After any web
source change, sync again before a native build. Normal `npm run build` and
Cloudflare output remain available. No hosting configuration is changed.

`npm run android:icons` regenerates launcher densities and splash from the
approved `public/splitleb-logo.png` using the existing Playwright dependency;
install its browser or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The master and web
branding assets remain unchanged. Adaptive art fits inside Android's 66/108 dp
safe circle. Generated Android project/resources are tracked; copied web
assets, SDK paths, caches, build outputs and signing material are ignored.

## Platform behavior

- Local assets load at permanent `https://localhost`; no `server.url`, remote
  startup, remote update loader or unrestricted `allowNavigation` is configured.
- Android never registers the PWA worker or subscribes to its update prompts.
  The APK is its update unit. Browser worker caching, integrity checks and dirty
  update protection are unchanged. The online/offline banner stays active in
  both environments using browser connectivity events; actual phone transitions
  still require QA.
- IndexedDB name/version/stores and all financial/domain/storage code are
  unchanged. No startup/update data clearing. Installing over the app with the
  same ID, origin and signing identity preserves its data. Browser/PWA data is
  a different sandbox: transfer it using backup export/import. Uninstalling or
  clearing Android app data removes records.
- Android Back dispatches cancel to the top open dialog first; otherwise it
  uses React Router history (and its existing unsaved-change confirmation).
  A cold deep link returns to Home; Back on Home backgrounds the activity.
- Browser backup downloads are unchanged. Android writes JSON only to private
  cache `backups/` and opens the standard share chooser with a scoped content
  URI. Choose a destination to save a durable copy. Cancellation is explicit;
  chooser success does not independently prove another app saved the file.
  Cache copies are temporary. Standard file-input import uses Capacitor's
  system picker. No legacy/external storage permission is needed.
- No external web links were found in product screens; Capacitor's default
  external navigation handling remains. Clipboard uses the existing web API.
- Permissions: `INTERNET` and `ACCESS_NETWORK_STATE` (normal install-time
  permission needed by Chromium WebView's connectivity notifier; no runtime
  prompt). No analytics, Firebase, tracking,
  authentication, remote database or sensitive runtime permissions. Auto Backup
  is disabled, consistent with local-only data and explicit JSON backups.
- Only the launcher activity is exported. FileProvider is non-exported and
  exposes only `cache/backups/` with temporary URI grants. Cleartext traffic and
  mixed content are disabled. No forced production WebView debugging.
- Dark `#101714` startup/window background, approved logo splash, light system
  icons, no orientation lock, and `adjustResize` keyboard behavior. Capacitor 8
  SystemBars native inset handling honors the existing non-cover viewport;
  there is no new edge-to-edge layout. No extra status/splash plugin required.

## Verification so far

Baseline at `d465ff0`: typecheck/lint/build pass, **123 tests / 21 files** pass.
After integration: typecheck/lint/build/sync pass, **133 tests / 23 files** pass.
New tests cover native worker isolation, Back routing/dialog cancellation,
native backup/cancel/error paths and unchanged browser downloads. Native plugin
calls are mocked only at the bridge boundary; these are not device proof.

Fresh Chromium 156 workflow checks passed at all 7 existing widths, including
financial edge cases, backup roundtrip, dirty navigation and accessibility.
`qa:unsaved` passed. `qa:prepare-v1` and all six `qa:pwa` scenarios passed,
including real legacy-data upgrade, browser close/reopen offline, update while
dirty, incomplete/mixed asset rejection and multi-tab retention.
Full command logs are in ignored `output/android-qa/` and browser artifacts in
`output/playwright/`. No emulator or physical device was attached at audit.

`npm run qa:android-shell` additionally passed five Chromium integration checks:
native platform detection and offline cold load from intercepted packaged files,
no worker/cache/update UI, actual router dirty-confirmation cancel, actual dialog
Back cancellation, IndexedDB persistence over full browser close/reopen at
`https://localhost`, and Home Back minimization. The Android bridge is mocked;
this does not prove Android WebView execution or physical behavior.

Independent review of `d465ff0..ef296b9` found no Critical issues. Its Important
finding was the WebView connectivity permission; added `ACCESS_NETWORK_STATE`
after confirming Chromium's notifier source requirement. Its Minor finding was
Capacitor's generated instrumentation test's placeholder package assertion;
replaced it with an optional real package/label smoke test and removed the
generated trivial arithmetic test. Instrumentation remains unrun without a
device. No findings were deferred. Physical behavior and APK inspection were
explicitly outside the evidence available to the reviewer at that time.

The initial SDK manager installation stalled at a zero-byte Build Tools
download. Official platform/Build Tools archives are being downloaded directly
and validated against Google's repository manifest; the tooling remains local
and ignored. APK results will be added after verification.

## Physical-device acceptance

**PHYSICAL DEVICE QA REQUIRED** — none of these are marked passed:

- [ ] APK installs and launches; app label, launcher logo and recent-app icon
  match SplitLeb; splash is correct without white/placeholder flashes.
- [ ] Home renders; all navigation works; create a group and USD/LBP bills;
  save, review, reopen/edit and inspect History.
- [ ] Force-close/reopen retains bills and groups. Installing a newer APK over
  this one with the same signing key retains them too.
- [ ] Airplane-mode cold launch; open old records; create/save a bill offline;
  force-close and reopen while still offline; records remain available.
- [ ] Reconnect: offline banner transitions correctly; local functionality is
  available in both connectivity states.
- [ ] Android Back closes dialogs first; unsaved navigation can be canceled;
  Home Back backgrounds normally. Check gesture and three-button navigation.
- [ ] Keyboard/numeric entry, long forms, dialogs and scrolling keep focused
  fields and important controls reachable; first Back dismisses keyboard.
- [ ] Export a JSON backup to a durable destination using the Android chooser;
  inspect/reimport it. Canceling the chooser keeps all saved data unchanged.
- [ ] Import via system picker, duplicates/conflicts and imported data work.
  Transfer an existing browser/PWA backup into Android.
- [ ] Status/navigation bars, cutouts and gesture area do not obscure controls;
  landscape/rotation remains usable; no crashes during these workflows.

Debug signing is for tests only. Keep this test installation's debug key if
testing in-place updates. A later permanent release key must be owner-approved;
switching from debug signing will require a backup/import migration.
