# Crowdsource critique fixes — todos (each commitable + pushable)

Critique 2026-10-27: 22/40 Acceptable (re-scoped to interactive check-in flow).
User rulings: collision + Esc first; keep 8-card density×AC matrix; all 5 issues + polish nits.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable layout` | P0: one panel at a time — collapse/hide feed drawer when modal opens (or raise modal above chrome with backdrop); no clipping at 390px | RED→GREEN `tests/crowd-layer.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable harden` | P1: document-level Esc dismissal for the modal (keep focus trap), matches backdrop-click | RED→GREEN `tests/crowd-esc.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable harden` | P1: verify-then-fix no-vehicle submit — role=alert error renders + announces, no POST without vehicle | RED→GREEN `tests/crowd-submit.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable shape` | P1: feed-card affordance — explicit "Locate vehicle" action with visible response + accessible name | RED→GREEN `tests/crowd-cards.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable shape` | P2: one combobox (search + select merged, result counts, line-scope chip, "Reporting on X" echo) | RED→GREEN `tests/crowd-picker.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 6 | `$impeccable polish` | Nits: locale-aware feed timestamp, Keandalan term consistency, reduced-motion feed dot, per-vehicle cooldown disclosure | RED→GREEN `tests/crowd-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`. Final step: re-run `$impeccable critique` on the crowdsource surface.
