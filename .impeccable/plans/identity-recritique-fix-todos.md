# Re-critique fix pass — todos (each committable + pushable)

Re-critique 2026-10-30: 24/40 Fair (14 → 24 → 24). User rulings: P1s first, all five, warn + attach for phoneless.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | P1: ceremony Cancel button (run-id invalidation + fetch abort) with live countdown in the status line | RED→GREEN `tests/member-ceremony-cancel.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | P1: phoneless registration warning + post-registration phone-attach | RED→GREEN `tests/member-phone-attach.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable polish` | P2: footer semantics fix (relabel Done / scope note that account changes apply immediately) | Manual copy check + existing suite, `detect --json`, `diff-check` |
| 4 | `$impeccable clarify` | P3: dedicated `linkPhoneLabel` ("must match the purchase phone") | RED→GREEN `tests/member-link-phone-label.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | — | Final sweep: headed-browser dismissal check deferred (no headed browser in this environment — documented), close ledger | `detect --json`, `diff-check`, commit + push |

Rules: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale i18n parity for new/changed copy. Each todo ships as its own commit + push to `origin main`.
