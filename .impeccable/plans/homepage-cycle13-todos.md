# Homepage cycle-13 todos (from 2026-10-21 critique 28/40, browser-backed)

Scope per user answers: full set, keyed CARTO, P0+P1 in one pass.
Each ships as its own commit + push.
Rules: ponytail, no emoji, strict TS, verify before every push
(`npx tsc --noEmit`, `npm test`, `impeccable detect --json`, `git diff --check`).

Verified tile facts (viewed, not assumed):
- CARTO dark_all/light_all + rastertiles variants: watermark "API KEY REQUIRED" (dead without key)
- Esri Canvas Dark/Light Gray: "Map data not yet available" (dead)
- OSM Standard: real data, keyless (fallback)
- Esri World Imagery: real data, keyless (satellite stays)

| # | Command | Fix | Status | Commit |
|---|---------|-----|--------|--------|
| 1 | harden | Keyed CARTO (env key) + OSM fallback + tile-error boundary; map-chrome focus rings | TODO | — |
| 2 | quieter | Declutter: fade non-journey markers/lines once a route is plotted | DONE | 06860f6 |
| 3 | clarify | Minimized banner dot: severity colour + count + single pulse | DONE | f45db41 |
| 4 | onboard | Persistent mini-legend for dot/status language in status drawer | DONE | e5aa351 |
| 5 | polish | Final pass over the whole path | DONE | plan-only |

## Close-out
- All 5 todos shipped, each verified (`tsc`, 377 tests, `detect --json`, `git diff --check`) and pushed.
- Remaining detector output (10 findings) is pre-existing: tooltip type/radius
  ramp in VehicleMarkerLayer (a file no prior detector run scanned) and the
  tab-indicator false positives in ServiceStatusDrawer. None introduced here.
- Cycle-12 snapshot NOT closed: confirming the P0/P1 needs a re-critique run.
