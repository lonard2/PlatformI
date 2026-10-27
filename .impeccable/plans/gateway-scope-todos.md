# Gateway modes leak far-away geometry — todos (each commitable + pushable)

Diagnosis (verified against dev.db): region gating filters by `regionId`,
and every line is tagged `reg-jabodetabek-01`, so nothing is hidden. But four
gateway-mode lines carry schematic straight-line tails far outside the metro
(KAI→Surabaya lng 112.75, AKAP→Jogja, shuttle→Bandung, PELNI→open sea).
Simulated vehicles travel those tails. Whoosh/KRL/Seribu are genuine
corridors and stay fully mapped. Fix is mode-based: AKAP_INTERCITY_BUS,
EXECUTIVE_SHUTTLE, KAI_INTERCITY, MARITIME_PELNI clip to the active region;
no schema change, future lines of those modes are covered automatically.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | data | Geospatial helpers (point-in-polygon, segment clipping) + GATEWAY_MODES + regions list in region store | RED→GREEN `tests/gateway-scope.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Route/vehicle layers clip + gate gateway modes; picker consumes store regions | RED→GREEN `tests/gateway-map.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
