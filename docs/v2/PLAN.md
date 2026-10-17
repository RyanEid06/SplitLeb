# SplitLeb V2 Implementation Plan

> Execute inline using superpowers:executing-plans, preserving the owner's complete implementation authorization. Use focused browser evidence for presentation changes and test-first regression coverage for changed behavior.

**Goal:** Complete the owner-authorized Web/PWA upgrade on `v2`.
**Architecture:** Preserve domain/storage contracts; rebuild presentation and extract coherent feature components and a shared bill editing hook.
**Tech stack:** Existing React, TypeScript, React Router, idb, Vitest, CSS and local browser automation.
**Spec:** DESIGN.md and OWNER-BRIEF.md.

## Global constraints

- `main` stays at `0a1334ed44cde1ef1cb48550fef18a71356f41e1`; only commit to `v2`; no push/deploy/merge.
- Keep database name/version/stores, backup v1/v2 and integer-cent domain semantics.
- No cloud, AI, accounts, tracking, Android, framework or CSS framework changes.
- Every touched page ends coherent at phone and desktop sizes; no weakened tests.

## Review focus

1. Dirty payments followed by settlement must persist the on-screen values.
2. Rapid edits during a slow save or another tab editing must not silently overwrite input.
3. Worker updates must not mix HTML/assets or reload during bill entry.
4. Large LBP, long names and 20+ people must remain readable at 320px.
5. Database upgrades and legacy backups must preserve IDs, archived states and exact totals.

## Tasks

- [x] 1. Safety/baseline: create branch, record untouched commands, inspect architecture, start application. Files: docs/v2/*.
- [ ] 2. Foundation/shell/home: replace styles/base/buttons/layout/home; AppLayout, Icon/Avatar primitives, recent lists. Verify actual browser navigation and widths, semantic labels and focus.
- [ ] 3. Bill workflows: create shared useBillEditor with guarded navigation and persistence/conflict handling; simplify NewBillPage/PeopleEditor; decompose ItemsPanel into entry/list/assignment; update Workspace, Review and payment layout. Add behavioral tests first for edit persistence and golden fixtures; run suite/typecheck.
- [ ] 4. Groups/history: decompose Groups into management, members, activity, balances, stats; section navigation; simplify backup copy and history. Browser verify archives/restores/group creation, duplicate/delete, backup round trip/conflicts.
- [ ] 5. PWA: build-specific worker identity, atomic shell caching, safe waiting-update notification, environment gating, matching manifest/icons; test lifecycle/offline relaunch in production preview.
- [ ] 6. Final QA/docs: responsive matrix, accessibility audit, upgrade from V1 on same origin, v1 DB migration, portable fixtures, dead assets, bundle check, full checks and independent review. Record exact evidence, limitations, scorecard; commit on v2 and stop for owner review.

For each task: add regression evidence before behavior changes, implement, run relevant checks, review and update PROGRESS.md in the same logical commit. Full final checks: `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, browser QA script.
