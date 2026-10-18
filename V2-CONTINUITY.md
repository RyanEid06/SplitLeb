# SplitLeb — current production continuity

## Approved branch mapping (2026-10-18)

- `main`: completed V2 web/PWA, now the web production source.
- `v1`: original production web app, frozen at `e0ccf8067ec5bcaca122d2d57a5e2d6afcb24064`.
- `android-app`: separate Android/APK source, unchanged at
  `bb7d3dabcc800e5927d764b00d57ad06596b561d` (official Android 1.0.1).
- Remove the former `v2` branch only after its tip
  `d465ff0a4cf9dec19b10e7bf33a83cbb75be9622` is an ancestor of verified `main`.
  No replacement V2 branch is wanted. The owner's approval supersedes older
  review-only/main-untouched restrictions in historical `docs/v2` records.

The owner explicitly authorized the promotion and final three-branch layout.
Temporary integration work occurs on `codex/promote-v2-production`; do not leave
that branch at completion. See `docs/PRODUCTION-PROMOTION.md` for evidence and
recovery. Progress is recorded in the promotion plan under `docs/superpowers/plans/`.

## Preserve

- Existing approved V2 UI, artwork, financial domain and PWA behavior.
- Permanent production origin `https://splitleb.pages.dev`, DB `splitleb-local-db`,
  bill/group IDs and archived states. No database reset or browser-data clearing.
- Shared import/storage repair from Android 1.0.1 is ported without Capacitor:
  DB v1/v2 migrates to v3, backup schema 1/2 stays compatible, writes are atomic,
  duplicates retain local copies, error categories are distinct.
- Android package, release tags, APKs, signing identity and branch stay untouched.
- Preview origins and Android do not share the web production IndexedDB.

## Verification and recovery

Run the full unit suite, typecheck, lint, production build, import browser cases,
responsive/axe workflows, unsaved forms and actual V1-to-V2 same-origin PWA upgrade.
Check current-head Cloudflare deployment and live assets after pushing `main`.
Local/Chromium proof is separate from existing users' browser/device acceptance.

`web-v1-archive-2026-10-18` preserves V1, and
`web-v2-before-production-2026-10-18` preserves pre-promotion V2. A verified local
Git bundle is retained in ignored `output/production-switch/pre-switch.bundle`.
After DB migration to v3, do not blindly deploy the old V1 DB-v2 code as a rollback.
Use a forward-compatible recovery build; never delete user data to downgrade.

Older V2 work and branding proof are in `docs/v2/`; they describe historical
milestones, not current branch boundaries. Do not create persistent automations
or update global memories without an explicit owner request.
