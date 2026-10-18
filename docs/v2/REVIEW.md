> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

# Independent code review

> Historical V2 code review. Current Android review/build evidence is in the [Android guide](../ANDROID.md). See the [V2 archive index](README.md) for context.

Initial immutable range: production `0a1334e` through `ce5e4bd`. A fresh reviewer inspected the implementation read-only and independently executed a service-worker deployment-race simulation. No Critical findings. Two Important and one Minor finding were accepted:

1. **Important:** status/MIME checks did not reject HTML from another deployment. Fixed by embedding/checking SHA-256 for every precached file. The reviewer independently reran the simulation: matching content installs; mixed HTML rejects and removes only the incomplete cache.
2. **Important:** bill dirty state did not cover unsubmitted setup/person/item drafts, and unconditional controller-change reload could lose edits begun during activation. Fixed with a shared aggregate registry, one app router blocker, rechecking before reload, timeout listener cleanup and guarded deferred Refresh. A browser regression first failed on an unadded person; the completed test then passed setup/person/item and activation-interval editing.
3. **Minor:** group member creation cleared input after a caught failure. Fixed by returning success explicitly and clearing only the submitted name after success, preserving newer input. The browser regression verifies duplicate-name failure retains the name.

Focused independent follow-up reviewed immutable `4c60eae9e9d2fe13295f9955b1736e1b34dd854e`. Verdict: all three findings resolved; no remaining concrete flaw found within that focused verification; ready for **OWNER REVIEW**, subject to the final browser rerun.

Reviewer checked and set aside as non-findings: current-payment settlement, atomic competing bill writes, legacy storage methods with no UI callers, unchanged database schema and narrow multiple-payment correction. The reviewer did not independently rerun the entire responsive browser matrix; that evidence was produced by the implementing session. This review grants no merge or deployment authorization.
