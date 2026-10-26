# Homepage chrome — footers todos (each commitable + pushable)

Scope: `src/components/navigation/MobileBottomNav.tsx` (+ crowdsource drawer only if the Warga-dismiss todo requires it) + `navigation*` i18n keys ×6 + one test file per todo. No API changes. User rulings: footers first; everything scored; numbered badge; 4 primaries + overflow; fix both Journey state and Map selection; Warga gets an explicit Tutup.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | Numbered Status severity badge (count + sr-only + aria-label); emerald dot only when zero | RED→GREEN `tests/chrome-footer-badge.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | Journey open-state treatment; AI resting loses permanent cyan + pulse | RED→GREEN `tests/chrome-footer-states.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable distill` | 4 primaries (Map/Route/Status/Tickets) + overflow sheet (Community/AI) with labels | RED→GREEN `tests/chrome-footer-overflow.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable audit` | Shared focus-visible ring on all tabs; inactive contrast bump | RED→GREEN `tests/chrome-footer-a11y.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable shape` | Map preserves selection (reset only when already home); Journey aria-disabled when handler absent | RED→GREEN `tests/chrome-footer-map.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 6 | `$impeccable shape` | Warga panel gets explicit Tutup closing the drawer | RED→GREEN `tests/chrome-footer-warga.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.

## Top bar follow-ups (user answers 2026-10-26)

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable colorize` | Promote alerts by severity (tint + numeric badge w/ aria-label); demote AI pill to neutral | RED→GREEN `tests/chrome-topbar-priority.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable polish` | Single isActive recipe + aria-pressed on all five toggles | RED→GREEN `tests/chrome-topbar-states.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable layout` | Compact mobile bar (brand mini + alerts badge + tickets + overflow); crowdsource gate to sm | RED→GREEN `tests/chrome-topbar-mobile.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable onboard` | Settings gains title + visible label at lg; alert count becomes a real badge | RED→GREEN `tests/chrome-topbar-onboard.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable verify-first` | Browser-verify the headless close-stall (4/5 drawers staying mounted); fix only if reproduced in a real browser | agent-browser reproduction protocol; fix commit only on positive repro |

Ruling: numeric badge reuses the `statusAlertCount` key when copy fits; new keys only if wording must differ.
Ruling: close-stall fix is gated on the verification run below — no code changes until repro is confirmed or refuted.
Ruling (verify-first, DONE 2026-10-26): browser verification reproduced the stall shape exactly under backgrounded-page conditions and refuted it as a user bug — `visibilityState=hidden`, exit transform frozen at frame ~0, every stuck dialog unmounting on one forced compositor frame. VERDICT: HEADLESS ARTIFACT. No code fix. Side note: header-toggle re-close is unreachable while a dialog overlays the header (layout, by design); Tutup + Escape are the real close paths.
