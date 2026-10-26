# Data-authoring improvements — todos (each commitable + pushable)

Audit: 4 parallel subagent reports (DB models+seeds, API CRUD, admin UI surfaces, static-vs-DB). Headline findings: GeoJSON-imported stops never persist (silent loss); vehicle extended identity dropped on save; stop stationType/scale packed into one `"::"` column; timetable PUT-as-upsert fabricates records + unguarded bulk delete; silent DB-failure fallbacks everywhere; no authz on writes; batch path skips validation; city timetable runs never seeded; ~75 MikroTrans bar cards vs 9 DB lines (bar bypasses DB); stale `line-airport-rail` reference; no wilayah/area field anywhere; hub/skybridge/uptime domain unmodeled.

Scope rule: schema/API/UI fixes that ship independently, smallest honest diff first. Deferred (needs design/product decisions, logged per item): write-route authz, hub/skybridge/uptime modeling, full ticket lifecycle (list/cancel), pagination, idempotency keys, crowdsource trust hardening.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | fix | GeoJSON-imported stops persist via direct POST (validate-then-write), counted toast, failures surfaced | RED→GREEN `tests/network-import-persist.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | fix | Line service-pattern fields authorable in network modal (headwayMinutes, first/lastDeparture, textColorHex) | RED→GREEN `tests/network-line-pattern.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | fix | Stop link/facility/platform fields authorable (connectedLineIds, facilities, platformType) | RED→GREEN `tests/network-stop-link.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | fix | Alert bulletins editable post-broadcast (title/desc/line/stops/ETA via edit modal + PATCH) | RED→GREEN `tests/alerts-edit.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | fix | Timetable PUT stops fabricating records (404 on unknown id); destructive bulk delete requires confirm count | RED→GREEN `tests/timetable-write-guard.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 6 | fix | Vehicle extended identity round-trips (runNumber/trainset/carFormation/depot/fleetNumber/licensePlate/operator + photos) | RED→GREEN `tests/fleet-extended-roundtrip.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 7 | data | Wilayah field: schema column on Line+Stop, seed backfill, network-modal dropdown, bar grouping follow-up noted | RED→GREEN migration + `tests/wilayah-field.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |
| 8 | data | Stale `line-airport-rail` reference corrected; MikroTrans bar-vs-DB coverage flagged in UI copy | RED→GREEN `tests/static-drift.test.ts`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change. Each todo ships as its own commit + push to `origin main`.
