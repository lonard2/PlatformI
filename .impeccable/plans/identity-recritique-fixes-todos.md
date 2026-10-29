# Identity re-critique fixes — todos (each committable + pushable)

Re-critique 2026-10-29: 24/40 Fair (up from 14/40 Poor).
User rulings: P1s first, all five issues, headed-browser dismissal check included.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable clarify` | P1: honest phone label (optional to register, required to sign in) | RED→GREEN `tests/member-phone-label.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable shape` | P1: scoped error slots per sub-form (link error above Link button) + move focus to it | RED→GREEN `tests/member-scoped-errors.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable clarify` | P2: button hierarchy + chooser line ("New here? Register. Returning? Continue.") | RED→GREEN `tests/member-chooser.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable polish` | P2: visible busy state on the pressed button ("Waiting…" + spinner); visibly disable the other ceremony button | RED→GREEN `tests/member-busy-visibility.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable polish` | P3: reservation-code help line + minors (singular/plural count, empty-history cross-link, logout feedback) | RED→GREEN `tests/member-link-help.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 6 | `$impeccable audit` | Headed-browser dismissal verification (Esc, X, overlay, trigger toggle) to close the artifact question with real evidence, plus dedupe of the double Escape handler | Manual browser pass + `detect --json`, `diff-check`, commit + push |

Rules per todo: minimal diff, no overengineering, no regressions, strict TypeScript, zero emoji, 6-locale i18n parity for new/changed copy. Each todo ships as its own commit + push to `origin main`.
