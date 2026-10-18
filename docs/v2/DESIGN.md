> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

# SplitLeb V2 design and safety contract

> Historical V2 design record. Later Android authorization and current release details are in the [Android guide](../ANDROID.md); context is in the [V2 archive index](README.md).

Owner brief: [OWNER-BRIEF.md](OWNER-BRIEF.md). Authorized scope is the entire Web/PWA V2 pass, implemented inline on `v2`; the owner retains production approval. No merge, deployment, framework rewrite, Android package, account, AI, analytics or backend.

## Intent

Make entering, splitting and settling a bill immediate and understandable on phones and desktop. Keep the existing deterministic calculation engine, saved data, group identities and backup contracts. Aim for mature, restrained dark-first design with an emerald accent and readable money.

## Approach and alternatives

Use the existing React/TypeScript application and domain modules. Replace accumulated presentation CSS with a small token-based system; separate page orchestration from item assignment, review breakdowns, group activity/balances/stats and storage state. A framework rewrite would increase regression risk without improving the core task. A superficial CSS overlay would preserve page complexity and contradictory responsive rules; replace those rules instead.

## Navigation and screens

- Desktop: compact persistent sidebar; mobile: four clearly labeled bottom destinations (Home, New bill, Groups, History), safe-area padding and no hamburger dependency.
- Home: New bill first, actual recent groups and bills, actionable empty states.
- Creation: one concise setup, optional name with a useful fallback, currency and people or saved group. Remove redundant setup summary. Preserve tax-included prices and k-LBP entry guidance. Group links preselect the correct group.
- Workspace: receipt entry and item allocation; extras and note progressively disclosed. Review is primary; explicit save and quiet dirty/saved status remain. Draft/active/settled states stay compatible.
- Review: people and final balance first. Expandable, labeled breakdowns on mobile; complete calculation transparency. Payment entry and transfers remain available. Settlement persists current edits, with confirmation and errors handled.
- Groups: persistent group chooser, new bill action, Activity/Balances/Stats/Members sections. Keep archived groups and members, stable identity, renaming and restoration. Stats are secondary.
- History: readable bill rows, duplicate/delete actions, concise device-storage notice, easy backup actions and optional details.

## State and data safety

Retain `splitleb-local-db` at schema version 2, all store/index names and backup schema versions 1/2. No migration is needed. Do not clear data. Preserve domain money, rounding, allocation, settlement, group and backup behavior. Add portable golden fixtures and browser upgrade verification using production-created records.

Keep explicit saving for this pass: editing includes transient invalid splits and draft/active affects group accounting. Autosave needs a deliberate policy for these states and multi-tab editing. Improve explicit save feedback and guard dirty navigation instead of silently changing semantics. Never show Saved until the write succeeds. Prevent stale async saves from replacing newer input; preserve unsaved data on errors. Detect external changes before overwriting a bill.

## PWA and accessibility

Development must never register a production worker (use Vite environment rather than a port heuristic). Generate a build-specific worker/cache identity. Install a complete shell before activation; offer a small Update action for waiting workers, retain old assets for open tabs, and defer updates while edits are unsaved. Offline launches use a coherent cached shell. Align manifest, browser chrome and icons with the actual dark background.

One main landmark, skip link, page-heading focus, native controls, field labels, meaningful live status, keyboard-accessible disclosure and confirmation, 44px targets, reduced motion and high-contrast focus. Wrap long names and large USD/LBP amounts without hiding data.

## Verification

Run locked install, TypeScript, lint, all existing/new tests and production build. Use a real browser at 320/360/390/412/768/1280/1600 widths, keyboard checks, representative bills/groups/history/backup, offline close/reopen and service-worker update lifecycle. Verify V1 data remains unchanged after V2 loads on the same origin, v1 database upgrades, legacy/current backup round trips and conflicts. Keep evidence and limitations explicit; automated browser proof is not physical-device or screen-reader acceptance.
