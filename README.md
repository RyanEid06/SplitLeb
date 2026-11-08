# SplitLeb for Android

SplitLeb splits bills and tracks shared expenses in USD and Lebanese pounds. **Version 1.0.1** runs on **Android 7.0 and newer** and packages the React and TypeScript app with Capacitor.

**[Download the Android APK](https://github.com/RyanEid06/SplitLeb/releases/download/android-v1.0.1/SplitLeb-Android-1.0.1.apk)** · [Latest release and checksum](https://github.com/RyanEid06/SplitLeb/releases/latest) · [Open the web app](https://splitleb.pages.dev/)

Open the downloaded APK and follow the install prompt. If you already use the official 1.0.0 build, install 1.0.1 over it to keep saved data. If you use a debug build with a different signing key, export and verify a JSON backup before uninstalling, then import it into the official app.

## Features and privacy

- Split items equally, by shares, or by custom amounts. Track extras, discounts, payments, and settlement transfers.
- Reuse groups, review history and statistics, duplicate bills, and export or import JSON backups.
- Work offline with local storage and no account. Android and web store data separately. Use backups to move records between devices or platforms.
- Keep USD and LBP balances separate. LBP entry uses thousands (`630` means LBP 630,000).

## Build from source

Install Node.js 24, JDK 21, and Android SDK 36. From this branch, run `npm ci`, then `npm run android:sync` and `npm run android:build` for a debug APK. Use the official signed APK above to update an existing release installation.

[Android build and signing guide](docs/ANDROID.md) · [Backup compatibility](docs/BACKUP-IMPORT-REGRESSION.md) · [Web source](https://github.com/RyanEid06/SplitLeb/tree/main)
