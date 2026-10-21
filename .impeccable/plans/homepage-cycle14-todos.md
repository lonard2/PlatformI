# Homepage cycle-14 todos (from 2026-10-21 critique 27/40, browser-backed)

Scope per user: both P1s in one pass, full set, dim the bright fallback.
Each ships as its own commit + push.
Rules: ponytail, no emoji, strict TS, verify before every push
(`npx tsc --noEmit`, `npm test`, `impeccable detect --json`, `git diff --check`).

| # | Command | Fix | Status | Commit |
|---|---------|-----|--------|--------|
| 1 | harden | Tile resilience + shared severity language + dimmed fallback | DONE | c61b1be |
| 2 | layout | Rail density: healthy systems collapse, auto-expand on alert/tap | DONE | 4965f89 |
| 3 | audit | Touch re-measure on coarse-pointer viewport; fix only what fails | DONE | verified-protected (no code change) |
| 4 | distill | Skeleton copy rewritten as user-facing progress | DONE | 02bf140 |
| 5 | polish | Final pass over the whole path | DONE | plan-only |

## Close-out
- All 5 todos shipped, each verified (`tsc` clean, 377/377 tests, `detect --json`, `git diff --check`) and pushed.
- Remaining detector output (10 findings) is pre-existing: tooltip type/radius
  in VehicleMarkerLayer and tab-indicator false positives — none introduced here.
- Cycle-13 snapshot NOT closed: confirming the two P1s needs a re-critique run.
