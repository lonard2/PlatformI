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
| 2 | harden login credentials | Presets fill ID only (or gate switcher behind non-prod flag); no plaintext passkeys | TODO | — |
| 3 | harden broadcast safety | Blast-radius confirm; persistent DENIED until dismissed; visible shift-log receipt | TODO | — |
| 4 | clarify verbs | Freeze one verb set across nav, hero, headings, i18n keys | TODO | — |
| 5 | clarify health percentages | Single labeled definition for the two health percentages | TODO | — |
| 6 | typeset micro-type | Four 9px badge usages up to DESIGN.md ramp (or documented exemption) | TODO | — |
| 7 | polish final pass | Whole-portal pass per polish.md triage order; detector clean | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm (all prior SDD work did the same).
- Pre-flight: todos 1/4/5 touch overlapping dashboard files (page.tsx, layout.tsx); executed sequentially inline so no interface drift. No shared-test conflicts.
- Todo 1: advisories show ALL active alerts sorted critical-first (no silent cap); telemetry keeps its sample. Ruling: removed the check icon instead of adding ack state (the icon meant nothing; a real ack workflow is a separate feature). Test-id slip (missing alert- prefix) caught by RED run and fixed in test, not code.
