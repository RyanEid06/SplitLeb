# Historical V2 web/PWA records

These records describe the completed V2 milestone before the production switch.
On 2026-10-18, the owner promoted V2 to `main`, retained the original web app on
`v1`, and kept the APK implementation on `android-app`. The separate `v2` branch
was removed. Old branch restrictions, database-v2 descriptions and pending
deployment statements below apply to their recorded milestone, not current work.

Start with the [current README](../../README.md),
[maintainer continuity](../../V2-CONTINUITY.md), and
[production promotion and recovery](../PRODUCTION-PROMOTION.md).
The [pre-promotion source](https://github.com/RyanEid06/SplitLeb/tree/web-v2-before-production-2026-10-18)
remains available through its immutable archive tag.

| Document | Contents |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Original V2 application and data design |
| [Verification](VERIFICATION.md) | Local web/PWA evidence and manual limits |
| [Final report](FINAL-REPORT.md) | Original review handoff |
| [Independent review](REVIEW.md) | Findings and resolution |
| [Original owner brief](OWNER-BRIEF.md) | Original requirements, preserved below an archive notice |
| [Baseline audit](AUDIT.md) | State before V2 implementation |
| [Design](DESIGN.md) | V2 design decisions |
| [Plan](PLAN.md) | Original implementation sequence |
| [Progress](PROGRESS.md) | Historical checkpoints |

Captured `baseline-*.txt` and `final-*.txt` files are historical logs. Current
web storage migrates to database version 3; backup schemas 1/2 remain supported.
Android release evidence belongs to the
[Android branch guide](https://github.com/RyanEid06/SplitLeb/blob/android-app/docs/ANDROID.md).
