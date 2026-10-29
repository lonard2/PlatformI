# PlatformI Robustness Program — Design Doc

Date: 2026-10-29. Approach picked: **A — horizontal layers first** (data →
honest commuter surface → completing money/trust paths → hardening),
run as continuous phases. Rejected: B (vertical slice; leaves two data
regimes coexisting and delays the shared pipeline), C (harden first;
longest time to visible value while the dataset keeps aging).

## Intent and why

PlatformI is a wide, demo-rich surface (2,000+ stops, ~60 lines, journey
planning, simulation, status, crowdsource, intercity ticketing, AI
assistant, admin/OCC) over a thin foundation: a frozen mid-2026 dataset,
hand-authored timetables, empty non-Jabodetabek regions, reservation-only
ticketing, and write routes without authz. "Robust" means the app stays
correct over time and completes what it starts — a commuter can trust
what they see, money and reports flow through finished paths, and every
write is authorized and validated.

## Goals

1. Data that stays fresh: scheduled GTFS refresh with validation gates
   that block bad data, drift reports, and visible freshness in UI.
2. A commute surface that never lies: no times/ETAs/status older than
   their refresh contract; honest empty/stale states everywhere.
3. Finished money path: reservation → payment → fulfillment → refund,
   idempotent throughout, guest + member flows.
4. Finished trust path: authorized writes, crowdsource anti-gaming,
   OCC moderation that closes the loop.
5. Admin/OCC that operates: gaps closed (hub/skybridge modeling, DB-backed
   grouping, cross-region lines or an explicit cut).

## Non-goals

- New regions with real transit data (regions stay empty-but-honest until
  a dedicated data phase; no invented data — existing rule).
- Real-time vehicle tracking hardware/GTFS-RT integration (design the
  seams, don't build the feed).
- Native apps, marketing site, or analytics platform.

## Anti-goals (what makes this a failure even if it ships)

- Commuter-visible times that are stale but presented as live.
- Taking payment (or holding reservations) without idempotency + refund.
- Trust features (crowd levels, reports) that can be gamed silently.
- A second, parallel data regime that the UI can't explain honestly.

## Constraints (project norms, non-negotiable)

Zero placeholder stubs; zero emoji (Lucide only); strict TypeScript (no
`any`); TDD RED→GREEN per task; each task = one commit + push to
`origin main`; verify before push (`tsc`, full suite, detector,
`diff-check`); 6-locale i18n parity on any key change; authentic
Indonesian operator names untranslated; no overengineering, no
regressions; critique → fix → polish → re-critique per surface.

## Phase plan (continuous)

### Phase 1 — Data freshness pipeline (unblocks everything)
- Scheduled GTFS import (script + runner wiring) building on
  `scripts/derive-gtfs-schedule.py` + `gtfs-derived.json`; validation
  gates (stop-count deltas, segment-time bounds, operating-window sanity)
  that fail closed; drift report persisted per run.
- Freshness contract in UI: per-dataset "updated" stamps + stale badges
  reusing the status-center stale pattern; fix remaining "today means
  dataset-max" labels.
- Seed hygiene: reproducible reseeds, scratch-DB verification, document
  feed vintages in `docs/gtfs-schedule-refresh.md`.
- Exit: a bad upstream feed cannot reach the UI; every dataset shows age.

### Phase 2 — Honest commuter surface
- Audit every time/ETA/status claim against the freshness contract;
  schedule-only toasts where geometry/data is absent (existing pattern).
- Disruption accuracy: alert lifecycle (active → resolved), deduplicate
  overlapping alerts, keep the per-alert View-on-map / Plan-alternate
  actions working across the new data.
- Crowdsource decay + trust display: keep the 10-min fade, add
  anti-gaming (rate limits already exist; add device/user anomaly flags
  + OCC visibility).
- Exit: re-run `$impeccable critique` on homepage + status + crowdsource;
  no silent-stale states.

### Phase 3 — Finished money path
- Ticket lifecycle state machine (reserved → paid → fulfilled/used,
  refund states already partially modeled in wallet); idempotency keys
  on all ticketing writes; payment integration (provider TBD — see open
  questions) behind the existing hub UI; webhook reconciliation.
- Guest + member flows, OCC refund panel already exists — wire it to
  the real lifecycle.
- Exit: a ticket can be bought, used, and refunded without manual DB
  edits; duplicate-submit safe.

### Phase 4 — Hardened writes + admin gaps
- AuthN/authZ on all write routes (alerts, fleet, network, timetables,
  crowdsource, intercity authoring); demo-mode gating kept explicit.
- Pagination on list endpoints; DB-backed transport-bar grouping;
  hub/skybridge/uptime modeling decision (model or cut with note).
- Cross-region lines: decide model vs explicit cut per `docs/multi-region.md`.
- Exit: `impeccable audit`-clean write surface; full suite + detector green.

## Parts decided already (from conversation)

- Approach A, continuous phases; keep the 8-card density×AC matrix.
- Priority order inside the work: collision + Esc class fixes before
  affordances; verify-then-fix for silent paths.
- Each phase ends with critique evidence, not just green tests.

## Left to the builder

- Exact GTFS scheduling mechanism (cron vs in-app runner) and hosting.
- Payment provider choice and webhook topology.
- AuthN mechanism (integrate with existing demo-mode + ENV badge?).
- Per-phase task breakdown, test files, and file-by-file edits.
- Whether empty regions get a "notify me" capture or stay silent.

## Calls made by the author (check while reading)

- Phases are sequential because each unblocks the next (data → honesty
  → money → hardening); resist starting Phase 3 before Phase 1 gates.
- Rejected expanding scope to new-region data or GTFS-RT hardware.
- Kept all existing product/design constraints as hard gates.

## Builder-check settlements (author's calls — veto at approval)

From the builder review 2026-10-29; settled without partner input:

- **Fail-closed behavior**: a failed GTFS validation quarantines the run
  and keeps serving the last-good dataset; nothing half-imported. The
  drift report persists per run and surfaces in OCC. Block thresholds:
  stop loss >5% per mode, median segment-time shift >30% on any
  corridor, route-coverage floor = current line count per mode (no silent
  line drops). Warn-only: timetable text/naming diffs.
- **Freshness TTL defaults**: alerts 5 min, GTFS-derived schedules per
  successful refresh run (stale badge past 7 days), hand-authored
  timetables 30 days with owner re-confirm, simulated positions 30 s,
  crowdsource 10-min fade (existing). "Updated" stamps check these.
- **Alert lifecycle**: OCC-owned (admin alerts board authors/resolves).
  Duplicate = same line + overlapping active window; latest record wins,
  history retained.
- **Model-vs-cut**: skybridge/hub entries stay display-only (transfer
  guidance, never routing weight) until a dedicated intermodal phase;
  cross-region lines are cut from routing (already clipped in map) and
  shown as text-only destinations; any UI implying a supported transfer
  that isn't modeled gets removed, not disabled.
- **Crowdsource write path**: stays low-friction (no mandatory account);
  anonymous submissions rate-limited per device + cooldown, visibly
  down-weighted until corroborated (see open question on enforcement).
