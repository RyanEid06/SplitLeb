# Backup import regression implementation plan

Goal: accept valid existing schema-v2 backups without resetting user storage or changing backup format, features, branding, hosting or V2 work.

Architecture: migrate IndexedDB v1/v2 to v3, creating missing stores and repairing indexes in the upgrade transaction. Use typed import failure categories and one atomic merge transaction. Keep file reading/JSON parsing separate from storage and post-import refresh.

Tech stack: TypeScript, idb, Vitest/fake-indexeddb, Playwright Chromium, Capacitor/Gradle.

User request in this chat is the specification. Execute inline using test-first changes and verification before completion.

- [x] Reproduce unchanged APK assets with unchanged supplied backup. Fresh succeeds (18 bills / 3 groups). v2 bills-only fails with NotFoundError opening a transaction for missing savedGroups. v1/v2 missing indexes fails on History refresh after import commit. Test harness: ignored output/import-investigation/reproduce.mjs. This is Chromium execution of APK assets, not physical-device proof.
- [x] Add full synthetic 18-bill/3-group fixture and real IndexedDB regression tests for migration, preservation, duplicates, validation and rollback.
- [x] Implement conservative v3 upgrade, cached-open recovery and connection lifecycle handling. Review also exposed blocked legacy connections; added a failing regression and recoverable error plus late-connection closure.
- [x] Add typed failure categories for file read, JSON, validation, relationships, conflict, DB/schema and transaction; preserve friendly UI and distinguish refresh failure after commit.
- [x] Run full tests (160/160 including original file), typecheck, lint, APK-asset browser reproduction (six scenarios) and signed Android production build. Exact results and limitations recorded in docs/BACKUP-IMPORT-REGRESSION.md.

Review focus: no store deletion/reset; existing data unchanged; request/synchronous write failures abort all changes; validation never weakened; failed open can retry; cross-tab schema upgrade closes old app connections. Preserve application ID, origin and signing identity.
