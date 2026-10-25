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
| 4 | bolder fourth KPI | Sector/worst-corridor posture KPI replaces fare volume; fare moves off-board | DONE (594/594) | — |
| 5 | harden states | Loading skeletons, telemetry-empty state, retry on stale banner | DONE (597/597) | — |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/page.tsx; executed sequentially inline so no interface drift. Todo 2's posture strip consumes the severity ordering already present (critical-first sort); todo 4 reuses the same posture computation — no conflicts, shared derivation.
- TDD + verification-before-completion loaded and governing.
- Todo 1: anchors live on the alerts page (broadcast-form card id, per-row alert-{id}); dashboard links to them. Ruling: hero broadcast reuses publishAlert verb key (same action, all 6 locales) instead of a new string; per-card CTA got the one new key.
- Todo 2: worstActiveSeverity memo shared with todo 4 (single derivation). Ruling: INFO maps to the Degraded word — any active bulletin means the network is not clear; the chip still names the exact tier so no information is lost. Subtitle demoted via color/size only, copy untouched.
- Todo 3: events carry code/status/speed/heading fields; render is a responsive grid (2 cols mobile, 5 desktop). Ruling: telemetryTracking key left dead per R3 precedent (fleet page keeps using telemetryHeading; only the dashboard concatenation is gone). telemetryFeed memo returns {events, total} so the count and the cap share one derivation.
- Todo 4: worst-corridor memo counts holds per lineId (CONGESTION_HOLD + OUT_OF_SERVICE). Ruling: basis line shows line NAME + count in parens ("Koridor 1 (3)") — operator entity data stays untranslated per i18n precedent, and no new count-word key was needed. Ruling: fare KPI deleted outright, not relocated — the scanner checkout flow owns fares; an ops board must not carry revenue math. kpiOccupiedCabinValue(+Basis) now dead per R3. HOLD color for the count is rose only when a corridor is actually held.
- Todo 5: board truth comes from the server (initial alerts []), single role=status skeleton wrapper with aria-hidden rows, telemetry empty state, retry button reusing retrySync. Ruling: dropped the DISRUPTION_ALERTS seed import — seeds masked fetch latency and failures as live data; the stale banner now owns the failure path. Ruling: telemetryEmpty is a static sentence (no testid needed; role text asserted).
