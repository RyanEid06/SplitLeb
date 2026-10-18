# V2 web production promotion implementation plan

Execute inline with verification before completion. The approved specification
is the owner conversation: main becomes the finished V2 web app, v1 preserves
the old web app, android-app remains separate, and exactly these three branches
remain. No source/data loss, Android changes, redesign or unrelated cleanup.

## Tasks and ledger

- [x] Inspect exact remote refs; preserve V1 at e0ccf80 and V2 at d465ff0 with
  annotated archive tags. Verify complete Git bundle. Push frozen v1 first.
- [x] Use a temporary local branch from remote main and merge V2 without rewriting
  history. Resolve README for the approved current branch layout.
- [x] Port only the already-tested shared storage/import repair, preserving web
  export and PWA behavior. Set web version 2.0.0 and update current docs.
- [x] Verify unit suite (149/149), typecheck/lint/build, six backup-import scenarios,
  responsive/axe, unsaved changes and actual original-V1 same-origin upgrade.
- [x] Independent review of promotion diff and safety constraints. Blocked/queued
  legacy-tab issue fixed and re-reviewed with no remaining actionable findings.
- [x] Fast-forward main to reviewed integration commit; push main; verify exact
  source Cloudflare status and live production assets/UI.
- [x] Verify original V1/Android refs and V2 ancestry, then delete merged v2 and
  local temporary branch. Confirm exactly main, v1, android-app locally/remotely.

Ruling: a temporary local branch in the existing clean checkout provides the
requested isolation; no new worktree or extra persistent remote branch is needed.
Ruling: ignore orphan local Android build artifacts on the web branch rather than
deleting them. No Android source is merged into the web tree.
Ruling: preserve legacy V2 documents as history; current README/continuity/promotion
report supersede their old no-deploy/review-branch constraints.
Ruling: database v3 repair is part of the approved safe promotion. An old V1
deployment alone is not a safe rollback after migration; recovery must retain
v3-compatible storage and never clear saved records.
Review finding: original V1 tabs do not close DB connections on versionchange.
Added a real original-V1-held-open regression (observed failing), a typed blocked
upgrade error and actionable close-other-tabs/reload guidance on initial
Home/History/Groups load. Migration and stored records remain unchanged.
The same regression then exposed queued open requests behind the first blocked
request: later pages never receive a blocked event and stayed loading forever.
Bounded the pending open to five seconds with distinct TimeoutError guidance;
the eventual native connection still closes without clearing data.

Completed: merge a0ee38e preserves original main and V2 as its two parents.
Cloudflare check succeeded for that exact source, deployment 54d8be15-beb6-4d2f-96d8-544f780426a9.
Live production JS/CSS/logo hashes match the verified build. Live isolated
synthetic import, 21 duplicates skipped, field preservation, reload and offline
reload passed. Both local and remote branches are exactly main, v1, android-app.
V2 has zero unique commits relative to main and remains preserved by its tag.
