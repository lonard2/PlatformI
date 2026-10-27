# Multi-region support — todos (each commitable + pushable)

Goal: Jabodetabek stays the default region; six more populous metros become
real, switchable regions grouped under Indonesia in a picker. New regions
start empty (no invented transit data) and are authorable from the studio.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | data | Region records for 6 metros (real names/centers/coarse bounds) + `countryCode` column + persisted active-region store + scoping helpers | RED→GREEN `tests/region-switch.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Country-grouped region picker in desktop header + mobile compact bar | RED→GREEN `tests/region-picker.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | fix | Scope map layers + planner + studio to active region; recenter on switch; honest empty states | RED→GREEN `tests/region-scope.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | fix | Gate transport bar catalog per region (legacy = Jabodetabek); scope fleet + alerts boards; docs | RED→GREEN `tests/region-bar.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
