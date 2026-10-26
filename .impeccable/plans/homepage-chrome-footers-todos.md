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
