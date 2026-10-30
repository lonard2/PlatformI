# Portal critique fixes — execution todos (2026-10-24)

Scope: all five priority issues + micro-type from critique
`2026-10-24T05-38-15Z__src-app-admin.md` (26/40 Acceptable).
User answers: event stream first, all issues, nothing off-limits.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | layout event stream | Split Advisories vs telemetry pings; never truncate advisory text; checks only for acknowledged items | DONE (514/514) | — |
| 2 | harden login credentials | Presets fill ID only (or gate switcher behind non-prod flag); no plaintext passkeys | DONE (Task 0) | — |
| 3 | harden broadcast safety | Blast-radius confirm; persistent DENIED until dismissed; visible shift-log receipt | DONE (Task 0) | — |
| 4 | clarify verbs | Freeze one verb set across nav, hero, headings, i18n keys | DONE (521/521) | — |
| 5 | clarify health percentages | Single labeled definition for the two health percentages | DONE (Task 0) | — |
| 6 | typeset micro-type | Four 9px badge usages up to DESIGN.md ramp (or documented exemption) | DONE (Task 0) | — |
| 7 | polish final pass | Whole-portal pass per polish.md triage order; detector clean | DONE (522/522, build green) | — |

## Ledger
- Setup: working on main with per-task push per user standing norm (all prior SDD work did the same).
- Pre-flight: todos 1/4/5 touch overlapping dashboard files (page.tsx, layout.tsx); executed sequentially inline so no interface drift. No shared-test conflicts.
- Todo 1: advisories show ALL active alerts sorted critical-first (no silent cap); telemetry keeps its sample. Ruling: removed the check icon instead of adding ack state (the icon meant nothing; a real ack workflow is a separate feature). Test-id slip (missing alert- prefix) caught by RED run and fixed in test, not code.
- Todo 2: presets still fill ID only (handleSelectPreset already cleared passkey); the rendered secret line is gone. Ruling: kept demo login working from documented credentials instead of gating behind env — the page is already the demo surface and IDs stay discoverable.
- Todo 3: confirm dialog follows the existing escalation-confirm pattern (role=alert, Escape, focus in/out). Ruling: DENIED stays until next scan or dismiss; GRANTED keeps the 3.5s auto-clear (success is transient, denial is evidence). Detector delta zero (1 pre-existing 9px pill, untouched).
- Todo 4: frozen names are the existing nav labels (no new strings). Ruling: removed 3 now-dead keys (broadcastAlert, qrScannerSimulator, manageFleet) to keep dictionaries honest; preset-section label keeps testTurnstileValidator as it describes presets, not the module.
- Todo 5: header keeps its label with a basis tooltip; KPI keeps its visible basis line. Ruling: script-generated non-en values had a stray trailing quote artifact — caught by tsc, repaired, zero leftovers verified across all six dicts.
- Todo 6: mono badges to 11px per ramp. Ruling: bump rather than exempt — enum-code badges are UI text, not data; detector now 0 on the portal.
- Todo 7: branch diff clean (170 added lines, no console/TODO/any); production build green. No further findings; nothing left parked.
- Task 0 reconciliation (Phase 6, 2026-10-30): Todos 2/3/5/6 verified DONE in code, tables updated. Evidence: #2 ID-only presets + NEXT_PUBLIC_DEMO_MODE flag (src/app/admin/login/page.tsx:66-81,176-186); #3 broadcast confirm dialog (src/app/admin/alerts/page.tsx:63-66,142-147) + DENIED persistence (src/app/admin/scanner/page.tsx:207-208) + shift-log receipt (src/app/admin/scanner/page.tsx:510); #5 basis tooltip + kpiFleetNotHeldBasis line (src/app/admin/page.tsx:369); #6 zero text-[9px] in portal surfaces (repo-wide hit is TimetableMatrixGrid only, carried to Phase 6 Task 3).
