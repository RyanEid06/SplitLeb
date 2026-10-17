# V2 progress ledger

## Safety / WP-V2.1

- Created `v2` from clean production `0a1334e`; verified `main` reference unchanged.
- Locked install and baseline complete: 96 tests green, typecheck/build green, pre-existing lint 5 errors + 1 warning.
- Audit/design/plan and full owner brief preserved alongside raw baseline logs.
- Ruling: implement inline under the owner's explicit instruction to audit then build completely; avoid repetitive approvals from general skill defaults. No worktree needed: requested `v2` branch in this checkout provides the chosen isolation.
- Ruling: keep explicit persistence with clear dirty/saved state and navigation guards; defer autosave state/accounting policy for owner discussion. Fix mark-settled stale-record issue.
- Pending: running-app visual baseline, foundation, all feature passes, compatibility/PWA/browser evidence and final independent review.
