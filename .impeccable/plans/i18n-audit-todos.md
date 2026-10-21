# i18n audit — execution todos (5 subagent audits, 2026-10-21)

Binding rule: every user-visible UI string via `t.*` (6 locales). EXEMPT and never touched: Indonesian proper nouns (operators, stations, places, koridor/line/vehicle codes, fleet numbers, model designations), brand names, SI units, timezone codes, coordinates, enum codes never rendered raw.

Global rulings:
- R1 WIB: EXEMPT everywhere (timezone designator, same class as km/h; Asia/Jakarta tz is already hardcoded). Auditors split; this settles it.
- R2 Placeholders: codebase has no ICU convention; introduce minimal `{n}` tokens in dict values + inline `.replace("{n}", String(n))` at call sites. Documented here, not a library.
- R3 SYSTEM_GROUPS (TransportationSystemBar): inspect render path before translating — auditor suspects statusText may be dead data behind localized getters. Translate only what renders.
- R4 Free-form operational content (skybridge guides, spec sentences, gallery captions, preset notes) moves to dictionaries with full 6-locale values written in this pass; place-name fragments inside stay Indonesian.

Protocol: ponytail, no emoji, strict TS, TDD where logic exists (pure helpers/validators get RED-first tests; copy moves verified by suite + parity test), verify before every push (`npx tsc --noEmit`, `npm test`, `impeccable detect --json`, `git diff --check`). One commit + push per batch. Ledger in this file.

| # | Batch | Scope | Status | Commit |
|---|-------|-------|--------|--------|
| 0 | Guard | Key-parity test (identical key sets ×6) + todos file | DONE (410/410) | — |
| A | alerts-crowd | Months via Intl (delete ID/EN arrays), time-ago {n} params, cooldown secondShort | DONE (410/410) | — |
| B1 | map-tooltips | VehicleMarker dead helper + ID tooltip copy, RoutePolyline labels, HubMarker enum mapping, MapControls tile names | TODO | — |
| B2 | system-bar | noMatchingRoutes concat param; SYSTEM_GROUPS per R3 | TODO | — |
| C | ticket-settings | DynamicQRCode copy, trip.status mapping, prefs modal labels; verify modes/PROMPT_SUGGESTIONS upstream | TODO | — |
| D1 | admin | alerts + fleet pages | TODO | — |
| D2 | admin+lib | network + timetables pages, layout metadata, timetableMatrix/modes/SIM_SPEED strings | TODO | — |
| E1 | inspector-enums | acStatus/seat-type/features/photo-tag/fareType enum mappings, gallery aria + Photo by | TODO | — |
| E2 | inspector-content | TechnicalSpecs sentences, gallery captions, HubDetailSheet procedural copy | TODO | — |
| E3 | skybridge | SKYBRIDGE_HUBS_DATA + chrome to dictionaries | TODO | — |

## Ledger
- Setup: working on main with per-batch push per user standing norm (revertible).
- Batch A: R1 applied (WIB kept as timezone designator at 4 sites). Detector on touched files: only 3 pre-existing border-accent advisories, unrelated.
