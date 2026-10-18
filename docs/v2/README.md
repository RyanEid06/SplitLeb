# V2 web/PWA records

These documents describe the completed **web/PWA V2 milestone** and its original
scope, implementation history and local verification. They are preserved as
historical evidence. Old statements such as “no Android,” “no APK” or “no release
tag” apply to that earlier milestone. V2 is now web production on `main`;
`v1` archives the original app and `android-app` contains the APK. The separate
`v2` branch has been removed. Historical database-v2 descriptions precede the
current storage repair to database version 3; backup schemas 1/2 are preserved.

Visit [web production](https://splitleb.pages.dev/) or read the
[web promotion report](https://github.com/RyanEid06/SplitLeb/blob/main/docs/PRODUCTION-PROMOTION.md).
The [pre-promotion V2 source](https://github.com/RyanEid06/SplitLeb/tree/web-v2-before-production-2026-10-18)
is preserved by an immutable archive tag.

For the current Android release, source, permanent signing and device checklist,
read [the Android guide](../ANDROID.md). The repository [README](../../README.md)
is the visitor entry point; [maintainer continuity](../../V2-CONTINUITY.md) records
current branch boundaries.

| Document | Contents |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | V2 application and data design |
| [Verification](VERIFICATION.md) | Web/PWA test evidence and manual limits |
| [Final report](FINAL-REPORT.md) | V2 outcome and review summary |
| [Independent review](REVIEW.md) | Findings and their resolution |
| [Original owner brief](OWNER-BRIEF.md) | Original requirements, preserved below an archive notice |
| [Baseline audit](AUDIT.md) | State before the V2 implementation |
| [Design](DESIGN.md) | V2 design decisions |
| [Plan](PLAN.md) | Original implementation sequence |
| [Progress](PROGRESS.md) | Historical checkpoints and debugging evidence |

The `baseline-*.txt` and `final-*.txt` files are evidence from that V2 run, not
current Android build logs. Current release verification is recorded in the
Android guide; local detailed Android reports remain in ignored `output/`.
