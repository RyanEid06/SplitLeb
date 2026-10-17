# Untouched V1 baseline — 2026-10-17

> Historical baseline before V2. This is not the current repository state. Start with the [V2 archive index](README.md) or [current Android guide](../ANDROID.md).

Production reference: `main` and `origin/main` at `0a1334ed44cde1ef1cb48550fef18a71356f41e1`. Clean working tree before creation of `v2`. No repository AGENTS.md or parent guidance found. Cloudflare configuration is not present; hosting relationship is owner-supplied and must remain unchanged.

## Architecture

React 19 + TypeScript 6 + Vite 8, React Router 7, idb 8. No backend. Routes: `/`, `/bills/new`, `/groups`, `/bills/:billId` and `/workspace` alias, `/review`, `/history`, `/404`. Domain functions are separate from page rendering. Bill workspace and review independently load and edit records.

Database `splitleb-local-db`, version 2: `bills` (updated/created/status indexes) and `savedGroups` (updated/created/archive indexes). Upgrade creates missing stores and preserves existing ones. Backup schema 1 supports bills; schema 2 bills + groups. Import validates references, skips duplicate bill IDs and identical groups, rejects conflicting groups before transactional writes. Existing storage tests mock the database; real-browser migration coverage is needed.

Money uses integer cents with stable allocation/remainder behavior. LBP entry multiplies by 1,000; settlement rounds to LBP 1,000. Equal, shares and custom allocation, extras, discounts, payments, running group balances, member archiving and stats exist. Preserve those modules.

## Baseline commands

| Command | Result |
| --- | --- |
| `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` | 184 packages installed |
| `./node_modules/.bin/tsc.cmd -b` | pass, no diagnostics |
| `npm run test:run` | 15 files, 96 tests passed |
| `npm run lint` | PRE-EXISTING FAILURE: 5 errors, 1 warning |
| `npm run build` | pass; JS 394.62 kB (116.81 gzip), CSS 74.22 kB (12.43 gzip) |

Raw logs accompany this audit. Initial sandbox attempts had tool-install timing and temporary-file rename failures; reruns outside the sandbox establish the code baseline above. The lint failures are set-state-in-effect in Workspace, History, Review and twice in Groups, plus a Groups dependency warning.

## Presentation and risks

- Home is a decorative hero without recent data. Mobile navigation collapses the desktop sidebar. Nested main landmarks and some unlabeled controls exist.
- CSS has 4,700+ lines across 13 files plus NewBillPage.css, repeated responsive overrides, gradients, glow, heavy typography and large radii.
- Hotspots: SavedGroupsPage 1,425 lines; ItemsPanel 900; ReviewPage 533; NewBillPage 480; History 421.
- Group management and eight-column review need progressive disclosure and phone layouts. New bill duplicates inputs in a summary and exposes member-ID implementation details.
- Workspace/review only persist on explicit actions. Mark-settled reads storage instead of saving current edits; save/load failures can be unhandled. No dirty navigation protection.
- Service worker skips only port 5173, caches HTML before all assets, has a fixed cache identity and no update prompt. Manifest splash is light while UI is dark. Cache cleanup can remove assets for other open tabs.
- README is the untouched Vite template. `vite.svg` is unused; `hero.png` must be checked against CSS before removal.

Running-app inspection and final evidence continue in PROGRESS.md and VERIFICATION.md.
