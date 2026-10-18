> **Historical record:** This document describes the original V2 milestone.
> V2 is now production on `main`; `v1` archives the old web app and
> `android-app` contains the separate APK. See the [current records index](README.md)
> for current branch, storage and release information. The original record follows.

You are working on **SplitLeb**, an existing React + TypeScript offline-first bill-splitting application.

Your job is to create and implement **SplitLeb V2** on a completely separate development branch while preserving all proven functionality and compatibility from the current production application.

# ABSOLUTE GIT / PRODUCTION SAFETY RULE

The current `main` branch is production.

Cloudflare Pages is hosting SplitLeb directly from `main`.

Therefore:

- NEVER commit directly to `main`.
- NEVER merge into `main`.
- NEVER force-push `main`.
- NEVER rebase or rewrite `main`.
- NEVER change Cloudflare deployment configuration in a way that causes the V2 branch to replace production.
- NEVER delete production data formats or intentionally break compatibility with the current deployed version.

Before doing implementation work:

1. Inspect the repository and current Git status.
2. Confirm the current production branch and repository state.
3. Create a dedicated branch named:

`v2`

If `v2` already exists, inspect it before touching anything and continue safely rather than blindly recreating it.

All V2 work must happen there.

Production stays untouched until I manually decide that V2 is finished and ready to merge.

---

# PROJECT GOAL

SplitLeb already works.

This is NOT a request to reinvent the product.

This is a **major UX/UI, architecture, maintainability, mobile, accessibility, and PWA quality upgrade** with a target quality level of roughly **9–9.5+/10 across all important categories**.

The app should ultimately feel:

- fast
- deliberate
- modern
- distinctive
- simple
- polished
- trustworthy
- fun without being childish
- optimized for both desktop and mobile
- extremely easy to understand
- entirely usable without AI
- entirely usable without an account
- fundamentally offline-first

The current app contains considerably better engineering than its presentation suggests.

Do not throw that away.

---

# IMPORTANT PRODUCT PRINCIPLE

SplitLeb should NOT become another bloated AI finance product.

Do NOT add:

- Gemini
- OpenAI
- AI assistants
- AI summaries
- chatbot functionality
- cloud accounts
- forced signup
- cloud sync
- unnecessary backend services
- analytics/tracking unless already present and absolutely required
- subscriptions
- ads
- fake “AI powered” branding

The product's strength is that it can perform its core job locally and immediately.

Core philosophy:

> Open SplitLeb → enter the bill → split it correctly → understand who owes what → done.

Keep that simplicity.

---

# CURRENT TECHNICAL FOUNDATION

Before changing code, thoroughly inspect the repository yourself and verify all of these findings.

The current application appears to already have strong foundations including:

- React
- TypeScript
- IndexedDB persistence
- PWA manifest
- service worker
- offline shell caching
- standalone PWA support
- saved bills
- saved groups
- group members
- archived members
- bill-local people
- stable group-member identity mapping
- settlement calculations
- group balances
- group statistics
- backup/export
- backup/import
- backward-compatible backup migrations
- USD support
- LBP support
- integer-cent financial calculations
- equal splitting
- weighted splitting
- custom item allocation
- extras
- discounts
- bill review calculations
- deterministic settlement transfers

There is also a substantial automated test suite. Previous inspection identified approximately **96 tests**, many of which exercise actual business logic rather than trivial rendering.

VERIFY this yourself.

Do not trust the summary blindly.

If the actual repository differs, document the discrepancy and make decisions from the code.

---

# FIRST PHASE — AUDIT BEFORE REFACTOR

Do not immediately start redesigning components.

First produce a concise internal audit of:

- current architecture
- route/page structure
- domain modules
- IndexedDB/storage architecture
- backup format
- migration behavior
- money representation
- settlement logic
- group model
- service worker
- manifest
- responsive behavior
- tests
- lint/build scripts
- dead code/assets
- accessibility weaknesses
- component-size hotspots

Run all appropriate baseline checks available in the repository.

At minimum try:

- install dependencies
- typecheck
- lint
- test
- production build

Use the project's real commands rather than inventing commands if scripts differ.

Record the baseline results before significant modification.

If something already fails on untouched V1 code, distinguish:

`PRE-EXISTING FAILURE`

from:

`V2 REGRESSION`

Do not “fix” a failing test by deleting or weakening the test.

---

# PRESERVE THE DOMAIN ENGINE

The core financial engine appears to be one of the strongest parts of the application.

Treat it as protected infrastructure unless you identify an actual bug.

Preserve behavior for:

- money parsing
- USD
- LBP
- integer-cent calculations
- equal allocation
- remainder-cent distribution
- weighted splits
- custom amounts
- extras
- discounts
- bill totals
- amounts paid
- balances
- underpayment
- overpayment
- settlement transfer calculation
- group running balances
- archived members
- active members
- missing member behavior
- group statistics
- group settlement
- saved bills
- saved groups
- bill ↔ group member identity mapping

If refactoring domain logic is truly useful, ensure exact regression coverage before doing it.

Never casually replace integer money arithmetic with floating-point calculations.

Financial totals must remain deterministic.

---

# BACKUP / STORAGE COMPATIBILITY IS CRITICAL

Users of production SplitLeb may have existing local data.

V2 must not casually destroy that.

Preserve and verify:

- IndexedDB schema compatibility where possible
- migration behavior
- existing saved bills
- saved groups
- group members
- archived member states
- historical bills
- V1 backup imports if currently supported
- V2/current backup imports
- duplicate backup detection
- conflict behavior
- export/import round-trip integrity

If any storage schema must change:

1. create a proper migration
2. preserve old data
3. add tests
4. document the migration
5. verify both fresh installs and upgrades

Never silently clear IndexedDB as an “easy fix.”

---

# CURRENT PRODUCT PROBLEMS IDENTIFIED

Previous code review identified that the **domain architecture is significantly stronger than the presentation layer**.

The modernization should focus heavily on the following.

---

# 1. REMOVE DEVELOPER-FACING COPY

The current application contains too much copy describing implementation details.

Examples previously found include concepts such as:

- “Version 2 groups”
- “same as v1.5”
- bill-local IDs
- group member IDs
- “saved locally before workspace opens”
- implementation details around mapping members
- overly verbose backup/storage explanations
- technical descriptions of offline behavior

This is bad UX.

Users should understand what they need to do, not how the database works.

Remove or rewrite this kind of language across the entire app.

Internal architecture can remain sophisticated.

The interface should not expose that sophistication unnecessarily.

Example principle:

Instead of explaining:

“Active group members are copied into this bill as bill-local people while preserving group member IDs”

the interface should simply behave correctly.

---

# 2. REDUCE VERBOSITY

Audit every:

- subtitle
- helper paragraph
- tooltip
- warning
- info card
- setup explanation
- backup explanation
- empty state
- status message

Delete anything that does not materially help the user make a decision.

Prefer:

short, useful sentences.

Do NOT turn the product into a wall of explanatory copy.

---

# 3. REMOVE GENERIC “AI SLOP” VISUAL DESIGN

The existing visual design uses many patterns associated with generic generated SaaS interfaces:

- huge ultra-heavy headings
- excessive 900/950 font weights
- uppercase eyebrow labels everywhere
- animated grid backgrounds
- glowing green blobs
- gold glow effects
- radial gradients
- multiple simultaneous gradients
- glassmorphism-like surfaces
- excessive shadows
- too many cards
- cards nested inside cards
- huge border radii
- glowing navigation states
- decorative effects that do not communicate anything

Do NOT simply replace this with another AI-generated design trend.

Do NOT turn everything into:

- glass
- gradients
- giant rounded rectangles
- neon
- excessive blur
- floating pills
- pointless animations

The design should feel intentional.

Effects should be earned.

---

# 4. PRESERVE A DISTINCT SPLITLEB IDENTITY

Do not make the application sterile.

I still want some personality.

The current dark identity and emerald/green direction are worth considering.

You may evolve the palette if necessary, but avoid generic blue fintech.

The application should develop a recognizable visual system based on things like:

- typography
- spacing
- money display
- people/avatar treatment
- iconography
- interaction patterns
- one clear accent identity
- restrained use of depth
- subtle transitions
- clear information hierarchy

Lebanese identity should be subtle and functional rather than decorative nationalism.

Useful Lebanon-specific behavior matters more than flags everywhere.

---

# 5. LEBANON-SPECIFIC FEATURES MUST REMAIN

Previous review identified meaningful Lebanon-specific behavior.

Verify and preserve it.

Examples include:

- USD currency handling
- LBP currency handling
- convenient LBP entry behavior such as “630” representing LBP 630,000 where that is current intended behavior
- LBP settlement rounding, apparently to approximately LBP 1,000 increments
- tax/menu assumptions currently encoded into product behavior where intentional

Do not change financial semantics because a generic US-focused UI library suggests something different.

Add regression coverage where appropriate.

---

# 6. HOME SCREEN REDESIGN

Current homepage appears visually competent but overly dependent on decorative effects.

Rebuild it to feel more confident and product-driven.

The homepage should quickly answer:

- What can I do?
- How do I start?
- Where are my groups?
- Where are previous bills?

Do not make it a marketing landing page inside an application.

Avoid huge empty hero sections.

The app should feel immediately actionable.

Potential high-level direction:

- concise greeting/title
- primary “New bill” action
- recent or active groups
- recent bills
- clean empty state if no data exists

Do not blindly implement this exact layout if testing the app suggests a better one.

---

# 7. NAVIGATION REDESIGN

Current major areas appear to be approximately:

- Home
- New Bill
- Groups
- History

The existing navigation is more desktop-oriented.

Desktop and mobile should not necessarily use identical navigation.

Desktop may keep a refined sidebar or other appropriate desktop navigation.

Mobile should receive intentionally designed navigation.

Do not simply shrink the desktop sidebar behind a hamburger and call that mobile UX.

Consider a proper mobile navigation model using the actual most important destinations.

Possible direction:

Home | Bills/History | New | Groups

But test the information architecture yourself.

Do not implement five destinations just because bottom nav can hold five.

---

# 8. MOBILE-FIRST EXPERIENCE

Responsive CSS alone is not enough.

Every important workflow must be deliberately designed for phone screens.

Audit at least approximately:

- 320px width
- 360px
- 390px
- 412px
- tablet sizes
- desktop
- large desktop

Ensure:

- no horizontal overflow
- no clipped buttons
- no microscopic tables
- no giant headers wasting half the viewport
- no touch targets that are too small
- no awkward dialogs
- no hidden critical content
- no desktop-only hover dependency
- correct sticky/footer behavior
- comfortable thumb interaction

---

# 9. NEW BILL FLOW

The current New Bill UI apparently includes sections similar to:

- Bill details
- People
- Setup summary

The setup-summary concept may simply duplicate information the user has already entered.

Simplify aggressively.

The New Bill flow should require the minimum necessary cognitive load.

Likely information includes:

- bill name/title if actually useful
- currency
- group or standalone mode
- people
- create/start

But do not assume every existing field deserves equal visual weight.

Keep functionality.

Improve hierarchy.

On mobile, make this flow extremely clean.

---

# 10. BILL WORKSPACE

The current bill workspace needs stronger action hierarchy.

Previous review identified a cluster of actions including things such as:

- Save draft
- Save bill
- Mark settled
- Review
- History
- Create another bill

Too many actions currently compete for attention.

Determine the actual state machine from code and redesign actions accordingly.

The user should always understand the next important action.

For example:

Primary:
Review bill

Secondary:
Save / status action

Overflow:
less frequent actions

Do not blindly use that exact hierarchy without testing the workflow.

---

# 11. INVESTIGATE AUTOSAVE

Because SplitLeb already uses local IndexedDB storage, explicit “Save draft” / “Save bill” interaction may be unnecessarily heavy.

Investigate whether the application can safely transition toward autosave or state-preserving behavior.

Potential UX:

`Saved ✓`

displayed quietly.

The user mental model should ideally be closer to:

Create → Split → Review → Settle

rather than:

Create → manually save → manually save again → review → manually manage document state.

HOWEVER:

This changes workflow semantics.

Therefore:

- inspect the existing draft/active/settled model
- determine whether autosave is safe
- implement only if it clearly improves UX without introducing data-loss risks
- add tests
- preserve compatibility

If uncertain after actually using/testing the app, DO NOT force this decision.

Instead leave a documented recommendation/question for me at the end.

---

# 12. REVIEW SCREEN

Current desktop review apparently uses a wide accounting-style table including concepts like:

- Person
- Items
- Extras
- Discounts
- Total
- Paid
- Balance
- Details

Desktop tables may remain appropriate.

Mobile should not be forced to display the same 8-column table.

Develop a native mobile representation.

Possible direction:

Ryan  
$34.20 total  
Owes $12.50

[View breakdown]

Then show detailed item/extras/discount/payment breakdown when requested.

The hierarchy should prioritize:

1. person
2. final amount/balance
3. whether they owe or receive
4. detailed calculation only when requested

Financial transparency must remain accessible.

Do not hide calculations so much that users cannot verify them.

---

# 13. SAVED GROUPS UX

Saved Groups is functionally sophisticated but apparently visually behaves too much like an admin dashboard.

Simplify it.

A group should feel like a persistent social object.

Example:

The Boys

Ryan  
Joseph  
Chris  
Mark

[New bill]

Then appropriate sections/tabs such as:

- Activity
- Balances
- Stats
- Members

Do not blindly copy this exact layout; inspect what existing functionality genuinely needs.

Preserve:

- stable group members
- archived members
- bill history
- balances
- group statistics
- settlement
- adding/removing/archiving/restoring members
- starting bills from groups

The goal is progressive disclosure.

Do not show every capability simultaneously.

---

# 14. LARGE UI COMPONENT REFACTOR

Previous inspection identified major UI monoliths.

Approximate examples:

`SavedGroupsPage.tsx` ~1,424 lines

`ItemsPanel.tsx` ~899 lines

`ReviewPage.tsx` ~532 lines

`NewBillPage.tsx` ~479 lines

Verify current numbers yourself.

Do NOT split files artificially just to reduce line count.

Instead identify coherent responsibilities.

For example a group page could potentially be decomposed into concepts such as:

- GroupHeader
- MemberList
- GroupActivity
- GroupBalances
- GroupStats
- GroupSettlementDialog
- MemberEditor
- NewGroupDialog

Names are examples only.

Extract:

- reusable view components
- relevant hooks
- domain selectors/calculations where appropriate
- dialog components
- form logic
- presentational components

Keep state ownership understandable.

Avoid prop-drilling hell.

Do not replace one giant file with twenty meaningless 40-line wrappers.

---

# 15. DESIGN SYSTEM

Create a coherent small design system rather than one-off styling per page.

Establish clear tokens for:

- background
- surface
- elevated surface
- border
- primary text
- secondary text
- muted text
- accent
- positive
- warning
- destructive
- focus
- shadows if needed
- spacing
- radii
- typography
- motion
- breakpoints

Components should have consistent states:

- hover
- active
- disabled
- loading
- focus-visible
- error
- success

Avoid giant radius values everywhere.

Do not make every element a card.

Use whitespace and grouping instead.

---

# 16. TYPOGRAPHY

Current interface apparently overuses extremely heavy typography.

Build a clearer type hierarchy.

Money should be especially easy to scan.

Ensure:

- readable body text
- strong but not comically heavy headings
- correct tabular-number handling where useful
- sensible line height
- responsive sizing
- long names do not destroy layout
- USD and LBP amounts remain readable at large values

---

# 17. ACCESSIBILITY TARGET: 9+/10

Treat accessibility as part of quality, not an afterthought.

Audit:

- semantic HTML
- heading hierarchy
- landmarks
- button vs div usage
- form labels
- input descriptions
- keyboard navigation
- focus-visible styling
- modal focus management
- Escape behavior
- aria attributes
- live regions where relevant
- color contrast
- status messages
- destructive action confirmation
- touch target sizes
- prefers-reduced-motion
- screen-reader comprehension

Do not add meaningless ARIA when native HTML already solves the problem.

---

# 18. DARK / LIGHT MODE

Inspect whether current SplitLeb intentionally supports only one theme.

Do NOT add light mode merely because modern apps “should have both.”

If current product direction strongly benefits from a polished dark-first identity, that can remain.

However:

- PWA manifest/theme/background colors must match actual product visuals.
- Browser chrome should not flash unrelated colors.
- splash/install visuals must be coherent.

If a high-quality light mode is easy and architecturally sensible, you may propose it.

Do not spend huge implementation complexity on it without clear value.

If unsure, leave it for discussion.

---

# 19. PWA HARDENING

The current application already has legitimate PWA infrastructure.

Improve it rather than replacing it.

Audit:

- `manifest.webmanifest`
- icon sizes
- maskable icons if appropriate
- `display`
- `start_url`
- theme colors
- background colors
- service-worker registration
- cache strategy
- navigation fallback
- application-shell caching
- offline behavior
- update lifecycle

Previous review found a potentially fragile service-worker development check based on port `5173`.

Verify this.

Do NOT determine dev/prod behavior based on one hardcoded development port.

Use environment/build semantics correctly.

The service worker should not become a development debugging nightmare.

---

# 20. PWA UPDATE UX

Installed users should not remain permanently stuck on stale bundles.

Implement a sensible update strategy.

Potentially:

- detect new service worker
- notify user unobtrusively
- offer refresh/update
- avoid unexpected data loss
- do not force reload while entering a bill

Keep this lightweight.

No giant “system update” modal.

---

# 21. OFFLINE UX

Core SplitLeb should work offline.

Test:

1. first online load
2. reload
3. close app/browser
4. disconnect internet
5. reopen
6. create a bill
7. use saved groups
8. review bill
9. navigate history
10. export data where browser APIs permit

No fake “offline mode.”

Actually verify it.

If some capability cannot work offline, identify it specifically.

---

# 22. DATA SAFETY UX

Current History/backup areas apparently contain long warning sections explaining local browser data, offline storage, etc.

The underlying concern is legitimate.

The UX is too verbose.

Replace walls of warnings with concise communication.

Example philosophy:

`Your data is stored on this device.`

`Export backup`

Optionally:

`Learn more`

Detailed explanation can exist behind progressive disclosure.

Keep backup functionality easy to find.

Do not scare users every time they open history.

---

# 23. EMPTY STATES

Audit all major empty states:

- first launch
- no history
- no groups
- empty group
- group with no bills
- no people
- no items
- no settlement necessary
- no stats yet

Empty states should help the next action.

Avoid generic generated copy like:

“Your financial journey starts here ✨”

Be concise and useful.

---

# 24. ERROR STATES

Audit all failure paths.

Errors should explain:

- what happened
- whether data is safe
- what the user can do next

Do not expose raw stack traces or internal IDs.

Examples:

Import failed.

Bill could not be saved.

Backup version unsupported.

Invalid split totals.

Be specific.

---

# 25. CONFIRMATION / DESTRUCTIVE ACTIONS

Audit:

- deleting bills
- deleting groups
- archiving members
- restoring members
- clearing data
- importing backups
- replacing data
- settling balances

Do not put modal confirmation on every trivial click.

Use confirmation where the result is destructive or difficult to reverse.

Use Undo where that is safer/better.

---

# 26. MOTION

Motion should communicate state.

Allowed examples:

- navigation transitions
- expanding breakdown
- saving confirmation
- modal transition
- subtle list insertion/removal
- settlement completion

Remove decorative background animation that burns attention or GPU without value.

Honor `prefers-reduced-motion`.

---

# 27. ICONOGRAPHY

Use a coherent icon set if one is already included or adding a lightweight one materially improves consistency.

Avoid:

- emoji as interface icons unless intentionally part of the brand
- random Unicode symbols
- mismatched icon styles
- giant decorative icons everywhere

Icons should support comprehension.

---

# 28. PERFORMANCE

Audit unnecessary rerenders and expensive calculations, especially around:

- large bill item lists
- many people
- group statistics
- running balances
- IndexedDB reads/writes

Do not prematurely overengineer.

But ensure common interactions feel instant.

Run production build and inspect bundle size.

Remove dead dependencies if safe.

---

# 29. DEAD CODE / ASSETS

Previous inspection noticed possible stale artifacts such as:

- `src/assets/vite.svg`
- `hero.png`

Verify whether they remain unused.

Remove dead:

- assets
- components
- imports
- CSS
- obsolete development files

Do not delete something merely because grep misses runtime usage without understanding the build.

---

# 30. CSS CLEANUP

Current CSS likely contains accumulated responsive overrides and one-off page rules.

Refactor carefully.

Goals:

- consistent tokens
- fewer duplicate declarations
- fewer magic numbers
- understandable breakpoints
- predictable responsive behavior
- no specificity wars
- no `!important` unless genuinely necessary
- component/page boundaries that make sense

Do not blindly convert everything to another CSS framework.

There is no need to introduce Tailwind merely for fashion.

---

# 31. DO NOT CHANGE FRAMEWORK WITHOUT A SERIOUS REASON

This is already React + TypeScript.

Keep it React + TypeScript unless you uncover an overwhelming technical reason not to.

Do NOT rewrite it in:

- Next.js
- Vue
- Svelte
- Angular
- Flutter
- Kotlin
- another framework

This work package is for **SplitLeb Web/PWA V2**.

Native Android will be a later project.

---

# 32. NO WEBVIEW ANDROID WORK NOW

Do not create an APK in this work package.

Do not add Capacitor merely so we can say Android exists.

Future plan is likely:

**native Android using Kotlin + Jetpack Compose**

after V2 web UX is finalized.

The existing web/PWA version will remain valuable independently.

---

# 33. PREPARE FOR FUTURE NATIVE ANDROID PARITY

Even though you are not building Android now, structure domain expectations so a future Kotlin implementation can reproduce calculations exactly.

Consider adding or organizing **golden test fixtures**.

Example JSON-like fixture:

Input:
- people
- items
- split configuration
- extras
- discounts
- payments
- currency

Expected:
- per-person totals
- balances
- settlement transfers

These fixtures could later be consumed by both:

- TypeScript tests
- Kotlin tests

Do not overengineer a cross-language framework now.

Simply make exact behavior easy to replicate.

---

# 34. TESTING REQUIREMENTS

Protect existing tests.

Add tests for regressions introduced or exposed during V2.

Important categories:

- equal splitting
- remainder cent allocation
- weighted splitting
- custom splits
- invalid custom totals
- extras
- discounts
- paid amounts
- final balances
- settlement transfers
- zero-balance settlements
- USD formatting
- LBP formatting
- LBP settlement rounding
- group bill creation
- archived members
- missing members
- group history
- group balances
- group statistics
- IndexedDB migration
- backup export/import
- V1/current backup import
- conflicts
- duplicate imports
- malformed backups

For UI workflows, add appropriate tests where practical.

Do not attempt to snapshot-test the entire application.

Test behavior.

---

# 35. TEST REAL EDGE CASES

Stress-test with scenarios such as:

- 2 people
- 20+ people
- person names that are very long
- duplicate display names
- very long bill names
- $0.01
- very large USD amounts
- very large LBP amounts
- totals that do not divide evenly
- 100/3-style cent remainder
- zero-cost items
- zero extras
- negative discounts if the existing domain allows them
- one person paying everything
- multiple payers
- payer not consuming items
- consumer paying nothing
- someone overpaying
- someone underpaying
- fully settled bill
- archived group member in historical bills
- imported legacy data

Never change expected financial semantics merely to simplify the UI.

---

# 36. TEST DATA PERSISTENCE ACROSS UPGRADE

This is essential.

Simulate:

V1/current production data → V2 application.

Ensure:

- bills remain visible
- groups remain visible
- names remain correct
- balances remain correct
- bill totals remain identical
- imports remain valid

A redesign that deletes users' history is a failed redesign.

---

# 37. RESPONSIVE QA

At minimum manually inspect all main screens in representative widths.

Main screens/workflows:

- Home
- New bill
- People
- Items
- extras/discounts if separate
- Review
- settlement
- Groups list
- Group details
- Members
- Group balances
- Group history
- Group statistics
- History
- Backup/export/import
- dialogs
- errors
- empty states

Test both touch-sized and desktop-sized layouts.

---

# 38. TARGET QUALITY

Aim for roughly:

Functionality: **9.5+/10**

Financial correctness: **9.5+/10**

Data safety: **9.5/10**

Desktop UX: **9+/10**

Mobile UX: **9+/10**

Visual design: **9+/10**

Accessibility: **9+/10**

PWA/offline: **9+/10**

Performance: **9+/10**

Maintainability: **9+/10**

Polish: **9+/10**

Do not fake these scores.

If something remains 7/10, tell me.

---

# 39. WHAT NOT TO DO

Do not:

- rewrite working domain logic for aesthetics
- introduce cloud accounts
- introduce AI
- add advertisements
- add subscriptions
- add unnecessary dependencies
- rebuild in another framework
- modify production `main`
- break backup compatibility
- clear IndexedDB
- eliminate useful functionality
- remove groups
- remove history
- remove settlement
- simplify calculations into incorrect floating point
- hide important financial breakdowns
- add tons of new features before V2 fundamentals are finished
- create a giant redesign that only looks good at 1440px
- call responsive CSS “mobile UX” without testing it
- create fake Apple-like glass UI
- replace one type of AI slop with another

---

# 40. THINGS YOU SHOULD INVESTIGATE RATHER THAN ASSUME

There are several areas where I intentionally do NOT want you to blindly implement a predetermined decision.

Investigate them in the running app first.

These include:

### Autosave
Would replacing explicit Save Draft / Save Bill improve UX without making states confusing?

### Navigation
What mobile navigation fits the actual workflows best?

### Theme
Should SplitLeb remain intentionally dark-first, or would high-quality light mode provide enough value?

### Group information architecture
Which data deserves tabs/sections versus direct visibility?

### Home page
What information genuinely matters on launch based on the actual app model?

### Bill naming
Is requiring a bill name helpful, optional, or friction?

### Stats
How prominent should group statistics really be?

### Backup warnings
How much explanation is actually necessary?

For these:

Try the app.

Inspect the code.

Implement obvious improvements.

If the correct decision remains genuinely ambiguous, do NOT make up a product decision merely to finish the task.

Instead include it under:

`OPEN PRODUCT DECISIONS`

in the final report with:

- current behavior
- option A
- option B
- your recommendation
- tradeoffs

I will decide afterward.

---

# 41. IMPLEMENTATION STRATEGY

Work iteratively.

Suggested order:

## WP-V2.1 — Safety + Baseline

- create `v2` branch
- baseline test/typecheck/lint/build
- document architecture
- identify regressions/pre-existing failures
- protect production

## WP-V2.2 — Foundation

- design tokens
- global typography
- layout primitives
- buttons
- inputs
- cards/surfaces only where needed
- dialogs
- focus states
- responsive foundation
- navigation architecture

## WP-V2.3 — App Shell + Home

- desktop navigation
- mobile navigation
- homepage
- global responsive shell
- app-level states

## WP-V2.4 — New Bill + Workspace

- bill creation
- people
- item workflow
- extras
- discounts
- payment entry
- action hierarchy

## WP-V2.5 — Review + Settlement

- desktop review
- mobile review
- breakdowns
- balances
- settlement workflow

## WP-V2.6 — Groups

- group list
- group details
- members
- archived members
- history/activity
- balances
- stats
- settlement
- new bill from group

## WP-V2.7 — History + Backup

- history
- backup/export
- restore/import
- concise data safety UX
- legacy compatibility

## WP-V2.8 — PWA

- manifest
- icons/colors
- service worker
- update lifecycle
- offline
- installability
- cache behavior

## WP-V2.9 — Accessibility + Polish

- keyboard
- screen reader semantics
- focus
- reduced motion
- empty states
- errors
- long text
- currency overflow
- touch targets
- animation cleanup

## WP-V2.10 — Final Verification

- tests
- typecheck
- lint
- build
- upgrade test
- offline test
- responsive QA
- dead code
- bundle check
- final code review

You may reorganize this sequence if repository realities suggest a better path.

---

# 42. DO NOT LEAVE HALF-FINISHED REDESIGN STATES

Each major page you touch should end in a coherent state.

Do not finish with:

- old navbar + new homepage
- old typography + new cards
- desktop done but mobile obviously broken
- half-migrated CSS
- unused legacy components everywhere
- duplicated old/new implementations
- TODO placeholders everywhere

Finish the complete V2 pass.

---

# 43. DOCUMENTATION

Update project documentation appropriately.

Document:

- how to run locally
- how to test
- how to build
- PWA behavior
- offline expectations
- backup compatibility
- V2 branch purpose
- important architecture
- any migrations

Do not fill README with marketing fluff.

---

# 44. COMMIT QUALITY

Commit work logically on `v2`.

Use useful messages.

Examples:

`refactor: establish SplitLeb v2 design foundation`

`feat: redesign mobile bill workflow`

`refactor: decompose saved groups experience`

`fix: harden service worker update lifecycle`

Avoid garbage messages like:

`changes`

`stuff`

`final2`

---

# 45. FINAL VERIFICATION

Before declaring V2 finished, run every relevant verification command.

Report exact results.

Example:

- install: success
- typecheck: 0 errors
- lint: 0 errors/warnings or clearly listed warnings
- unit tests: X/X passed
- integration tests: X/X passed
- production build: success
- PWA/service worker: verified
- offline reopening: verified
- legacy upgrade: verified
- legacy backup import: verified
- current backup round-trip: verified

Do not say “should work.”

Either verify something or state clearly that it was not verified.

---

# 46. FINAL REPORT

When the work is complete, give me a structured final report containing:

## Branch
- active branch
- confirmation `main` untouched
- commit hash(es)

## Baseline
- what initially worked
- what initially failed

## Major Changes
- architecture
- UI
- UX
- mobile
- desktop
- PWA
- accessibility
- copy
- maintainability

## Files Refactored
Especially major monolithic components.

## Functionality Preserved
Explicitly list core features.

## Tests
Exact commands and exact results.

## Offline/PWA
Exact verification performed.

## Migration/Data Safety
How old users are protected.

## Visual/UX Improvements
Summary of major differences.

## Known Issues
Anything still imperfect.

## Open Product Decisions
Anything intentionally left for my decision.

## Remaining Work to Reach 9.5+
Be critical.

Do NOT tell me everything is 10/10 because you wrote it.

If something deserves 8.4, say 8.4 and explain why.

Finally provide a scorecard:

- Functionality
- Financial correctness
- Desktop UX
- Mobile UX
- Visual design
- Accessibility
- Offline/PWA
- Data safety
- Performance
- Maintainability
- Overall V2 readiness

Score each out of 10.

---

# 47. FINAL RELEASE RULE

DO NOT MERGE `v2` INTO `main`.

DO NOT DEPLOY V2 OVER PRODUCTION.

At the end, stop with the completed V2 branch ready for my review.

Production `main` must remain exactly under my control.

---

# SUCCESS DEFINITION

A successful result is NOT:

“SplitLeb now looks more modern.”

A successful result is:

SplitLeb keeps its proven financial/domain behavior and local-first architecture, but now feels like a mature product someone intentionally designed rather than a technically strong project wrapped in an older AI-SaaS visual shell.

It should be:

- immediately understandable
- faster to operate
- substantially cleaner
- excellent on phones
- excellent on desktop
- fully credible as an installable PWA
- private
- offline-first
- financially trustworthy
- maintainable
- visually recognizable
- free of unnecessary implementation jargon
- free of pointless feature creep

Start by auditing the real repository and running the application.

Do not blindly implement assumptions from this prompt.

Verify them.

Then build SplitLeb V2 completely on `v2`, preserve `main`, and finish with the full verification/report described above.