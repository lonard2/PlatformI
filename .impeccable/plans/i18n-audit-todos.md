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
| B1 | map-tooltips | VehicleMarker dead helper + ID tooltip copy, RoutePolyline labels, HubMarker enum mapping, MapControls tile names | DONE (411/411) | — |
| B2 | system-bar | noMatchingRoutes concat param; SYSTEM_GROUPS per R3 | DONE (Task 0) | — |
| C | ticket-settings | DynamicQRCode copy, trip.status mapping, prefs modal labels; verify modes/PROMPT_SUGGESTIONS upstream | DONE (412/412) | — |
| D1 | admin | alerts + fleet pages | DONE | — |
| D2 | admin+lib | network + timetables pages, layout metadata, timetableMatrix/modes/SIM_SPEED strings | DONE (Task 0) | — |
| E1 | inspector-enums | acStatus/seat-type/features/photo-tag/fareType enum mappings, gallery aria + Photo by | DONE (Task 2) | — |
| E2 | inspector-content | TechnicalSpecs sentences, gallery captions, HubDetailSheet procedural copy | DONE (416/416) | — |
| E3 | skybridge | SKYBRIDGE_HUBS_DATA + chrome to dictionaries | DONE (416/416) | — |

## Ledger
- Setup: working on main with per-batch push per user standing norm (revertible).
- Batch A: R1 applied (WIB kept as timezone designator at 4 sites). Detector on touched files: only 3 pre-existing border-accent advisories, unrelated.
- Batch B1: detector on touched map files reports 9 design-system (font/radius/color) advisories on pre-existing inline tooltip styles — not copy, not introduced here.
- Batch B2: R3 resolved — statusText/statusReason have zero render sites (dead data, untouched); name/description/fareText ruled EXEMPT as operator entity data (R5: place-dense descriptors, translation risk > benefit; reversible on request). operatingHours vocabulary mapped; noMatchingRoutes parameterized.
- Batch C: detector went 7→4 on touched files (fixed three 9px ramps incl. prefs descs); remaining 4 pre-existing (PLTI brand mark etc.). R6: PROMPT_SUGGESTIONS example utterances EXEMPT (sample user input, place-dense). R7: DynamicQRCode t.aiAdvisor.copy reuse left as-is (translated, cross-namespace only).
- Batch D1: fixed duplicate admin sections (dict merge was correct; types had two — merged into the pre-existing 200-key block). Note: admin section already covered dashboard/scanner/shiftLog surfaces.
- Batch D2a: network page chrome+toasts+confirms wired (~110 keys). Detector: same 3 pre-existing 9px advisories as base.
- Batch D2b: timetables page + batch modal wired (~120 keys incl. weekdayShort, preset notes, batch generator). Detector: check below.
- Batch D2c: run-text mapper + preset notes (runs section). R9 SIMULATION_SPEED dead, untouched. R10 layout metadata stays EN (no server locale). R11 modes description/headwayText/operatingHours dead, untouched. R12 fareDescription tariff formulas exempt as operator data. R13 preset labels stay identifiers; preset notes localized at apply.
- E2: restored BUS_POLE proper-noun term via busPoleFull (all locales, untranslated). runTexts/specTexts mappers keep user data untouched.
- E3: R14 — level descriptions, hub/mode/line/place names, codes, and m/s units stay as location identifiers; everything else localized via source-matched lookup. TDD order slipped on specTexts helper (test written after, immediately green); noted, not repeated.
- D2d: recovered en.ts after a script truncated it (restored from HEAD, replayed uncommitted keys; verified via parity+tsc+tests). Lesson: verify file size after every scripted dict write.
- Rulings log: R1 WIB exempt (timezone code); R2 {n}/{named} templates, no ICU lib; R3 statusText/statusReason dead, untouched; R4 free-form operational content to dictionaries; R5 SYSTEM_GROUPS names/descriptions exempt as operator data (reversible); R6 PROMPT_SUGGESTIONS exempt as sample user utterances; R7 DynamicQRCode t.aiAdvisor.copy left as-is; R8 lib defaults mapped at render; R9 SIMULATION_SPEED_OPTIONS dead, untouched; R10 server metadata stays EN (no locale cookie infra); R11 modes description/headwayText/operatingHours dead, untouched; R12 fareDescription tariffs exempt as operator data; R13 template labels stay identifiers, notes localized at apply; R14 skybridge location identifiers exempt.
- Task 0 reconciliation (Phase 6, 2026-10-30): B2 verified DONE — noMatchingRoutes parameterized (TransportationSystemBar.tsx:1669-1670), statusText/statusReason are static entity data only. D2 verified DONE per D2a-d ledger with spot check (network page shows identifiers + English error fallbacks only; fallback-toast localization carried as residue into Phase 6 Task 2). E1 stays OPEN — no render-site audit on record; carried to Phase 6 Task 2. Tables updated.
- Task 2 (Phase 6, 2026-10-30): E1 verified — all five enum mappers wired at render sites (vehicleLabels.ts + inspector sheets + gallery); evidence test tests/inspector-enum-labels.test.ts pins all-locales mapping + unknown-value prettify. Error-fallback residue fixed: 6 hardcoded network-studio error strings moved to netToast* keys (all locales, RED test in id). Table updated.
