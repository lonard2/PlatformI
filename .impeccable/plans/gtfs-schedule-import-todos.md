# GTFS Schedule Import — execution todos (from gtfs-schedule-import-plan.md)

Rules: ponytail, no emoji, strict TS, verify before every push
(`npx tsc --noEmit`, `npm test`, `impeccable detect --json`, `git diff --check`).
One commit + push per todo. No raw GTFS zip in the repo, ever.

| # | Command | Task | Status | Commit |
|---|---------|------|--------|--------|
| 1 | harden | T1: GTFS fetch + derive script → gtfs-derived.json (allowlisted services, 41 routes) | DONE
| 2 | audit | T2: artifact validation + unit tests (schema, spot-checks, drift report) | DONE
| 3 | harden | T3: segment-based planner ETA with flat fallback | DONE
| 4 | clarify | T4: adaptive board (5/8/10) + past-3 toggle + window clipping | DONE
| 5 | onboard | T5: timetable overflow dialog (>20 rows, cap 60, grouped by line) | DONE
| 6 | polish | T6: attribution line × 6 locales + re-pull docs note | DONE

Decisions locked 2026-10-21: adaptive counts by stop scale (5/8/10, ≤3 past, ~20 overflow → dialog cap 60); drift reporting only, never auto-overwrite hand-authored hours/headways.
