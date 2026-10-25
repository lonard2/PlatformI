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
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | DONE (598/598) | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/page.tsx; executed sequentially inline so no interface drift. Todo 2's posture strip consumes the severity ordering already present (critical-first sort); todo 4 reuses the same posture computation — no conflicts, shared derivation.
- TDD + verification-before-completion loaded and governing.
- Todo 1: anchors live on the alerts page (broadcast-form card id, per-row alert-{id}); dashboard links to them. Ruling: hero broadcast reuses publishAlert verb key (same action, all 6 locales) instead of a new string; per-card CTA got the one new key.
- Todo 2: worstActiveSeverity memo shared with todo 4 (single derivation). Ruling: INFO maps to the Degraded word — any active bulletin means the network is not clear; the chip still names the exact tier so no information is lost. Subtitle demoted via color/size only, copy untouched.
- Todo 3: events carry code/status/speed/heading fields; render is a responsive grid (2 cols mobile, 5 desktop). Ruling: telemetryTracking key left dead per R3 precedent (fleet page keeps using telemetryHeading; only the dashboard concatenation is gone). telemetryFeed memo returns {events, total} so the count and the cap share one derivation.
- Todo 4: worst-corridor memo counts holds per lineId (CONGESTION_HOLD + OUT_OF_SERVICE). Ruling: basis line shows line NAME + count in parens ("Koridor 1 (3)") — operator entity data stays untranslated per i18n precedent, and no new count-word key was needed. Ruling: fare KPI deleted outright, not relocated — the scanner checkout flow owns fares; an ops board must not carry revenue math. kpiOccupiedCabinValue(+Basis) now dead per R3. HOLD color for the count is rose only when a corridor is actually held.
- Todo 5: board truth comes from the server (initial alerts []), single role=status skeleton wrapper with aria-hidden rows, telemetry empty state, retry button reusing retrySync. Ruling: dropped the DISRUPTION_ALERTS seed import — seeds masked fetch latency and failures as live data; the stale banner now owns the failure path. Ruling: telemetryEmpty is a static sentence (no testid needed; role text asserted).
- Final review ses_e8ed92ca0ffeL6a2oN7Yc1V2VX: approve, no blocking defects. Final: fixed Important first-load false all-clear (stale-aware unknown copy when the feed never loaded) — test RED (unknown copy absent) then GREEN.
Final: minor (deferred): INFO advisories still styled amber in the feed badge.
Final: minor (deferred): timestamps lack <time dateTime>.
Final: minor (deferred): new fragment targets #broadcast-form/#alert-{id} not focusable (no tabIndex=-1).
Final: minor (deferred): telemetry empty state not announced (no live region).
Final: minor (deferred): worst-corridor KPI misreports on unmatched lineId (shows clear despite held vehicles).
Final: minor (deferred): pulsing LIVE dot has no reduced-motion guard; hardcoded Dukuh Atas TOD; lists remain div soup.
Final: minor (deferred): placeholder reorder (ja/ko/zh {m}/{n}) untested; no CRITICAL-posture/INFO-Degraded/tie/fragment-resolution coverage; subtitle-demotion test is class-coupled.
Final: Ruling: visual/heuristic quality unjudged (read-only review, no render) — accepted; detector 0 plus attribute tests are the verification on record. Cost if wrong: posture-strip hierarchy or KPI balance issues invisible to the suite.
Final: Ruling: 597/597 suite result accepted from recorded evidence per review instructions, not re-run by reviewer.
Final: Ruling: ar/ja/ko/zh translation quality spot-checked for structure only; no fluency claim made. Cost if wrong: awkward phrasing in 4 locales.
Final: Ruling: sticky-header overlap on fragment navigation and runtime /api/alerts id consistency not statically verifiable — first manual pass should click through hero CTA, advisory link, and broadcast link.
| 7 | polish all deferred minors | div→ul/li, time elements, cyan INFO, focusable anchors, announced empty telemetry, lineId fallback, reduced-motion, hub key, coverage locks | DONE (609/609) | — |
- Todo 7: INFO badge cyan; advisory + telemetry <time dateTime>; advisory/telemetry lists are real <ul>/<li>; broadcast + alert anchors focusable (tabIndex -1); telemetry empty announces via role=status; worst-corridor falls back to raw lineId; LIVE pulse + skeletons honor reduced-motion; hub name via occHubName key; clearing test replaced the class-coupled subtitle assertion with reading-order proof.
Ruling: role=status is not name-from-content in ARIA, so the telemetry test asserts presence via testid, not name matching — the name-based query can never match.
Ruling: no supervisor tel: link — inventing a contact number would be fabrication; the lockout copy already directs to the supervisor, and a real number from the user unlocks the link.
Ruling: dashboard mock shape ({ok, json}) is the contract the new loadAlerts requires; two tests initially stubbed bare {success, data} and correctly failed — mocks must honor the Response shape.
