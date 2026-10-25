# Dashboard critique fixes — execution todos (2026-10-26)

Scope: all five dashboard issues P0→P3 + final polish, from critique
`2026-10-25T02-52-55Z__src-app-admin-page-tsx.md` (18/40 Poor).
User answers: operate actions first, replace 4th KPI with posture, all five issues.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | layout operate actions | Per-card "Open incident queue" CTA, advisory rows as links to /admin/alerts, hero broadcast entry | DONE (584/584) | c5ce44b |
| 2 | distill posture hero | Hero posture strip (state word + worst-severity chip + WIB clock), demoted subtitle | DONE (588/588) | b1f5dbb |
| 3 | clarify telemetry stream | Structured columns, disclosed N-of-M basis, "View all in Fleet" cap | DONE (591/591) | — |
| 4 | bolder fourth KPI | Sector/worst-corridor posture KPI replaces fare volume; fare moves off-board | TODO | — |
| 5 | harden states | Loading skeletons, telemetry-empty state, retry on stale banner | TODO | — |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/page.tsx; executed sequentially inline so no interface drift. Todo 2's posture strip consumes the severity ordering already present (critical-first sort); todo 4 reuses the same posture computation — no conflicts, shared derivation.
- TDD + verification-before-completion loaded and governing.
- Todo 1: anchors live on the alerts page (broadcast-form card id, per-row alert-{id}); dashboard links to them. Ruling: hero broadcast reuses publishAlert verb key (same action, all 6 locales) instead of a new string; per-card CTA got the one new key.
- Todo 2: worstActiveSeverity memo shared with todo 4 (single derivation). Ruling: INFO maps to the Degraded word — any active bulletin means the network is not clear; the chip still names the exact tier so no information is lost. Subtitle demoted via color/size only, copy untouched.
- Todo 3: events carry code/status/speed/heading fields; render is a responsive grid (2 cols mobile, 5 desktop). Ruling: telemetryTracking key left dead per R3 precedent (fleet page keeps using telemetryHeading; only the dashboard concatenation is gone). telemetryFeed memo returns {events, total} so the count and the cap share one derivation.
