# Vehicle sheet follow-up — execution todos (from critique 2026-10-21T05-25-05Z)

Binding constraint (user, 2026-10-21): enthusiast information is MAINTAINED, never
deleted/removed. Design changes layer it behind disclosures, defaults, and
progressive disclosure — full detail stays one tap away. Any step that would
delete enthusiast content is a plan defect: rule and reroute, do not delete.

Protocol: ponytail, no emoji, strict TS, TDD (test RED before code), verify
before every push (`npx tsc --noEmit`, `npm test`, `impeccable detect --json`,
`git diff --check`). One commit + push per todo to origin main.
Ledger lives in this file under "Ledger".

| # | Command | Task | Status | Commit |
|---|---------|------|--------|--------|
| 1 | clarify | Seating tab → boarding tool: car stepper + emptiest-car default + Show-seats disclosure; matrix kept intact behind disclosure | DONE (394/394) | — |
| 2 | colorize | Occupancy scale made explicit: numeric legend + labeled bars, thresholds moved to shared helper | DONE (397/397) | — |
| 3 | harden | Honest controls + failure states: occupied seats non-interactive w/ aria-disabled + not-booking microcopy; image-fail / empty-carriage / offline states; simulated-data badge; keyboard for SVG carriage nodes | DONE (403/403) | — |
| 4 | layout | Overview reorder: gallery under header, compact line/fare/headway row; tab label vs content mismatch fixed | DONE (405/405) | — |
| 5 | distill | Single VehicleOpsRunCard; sheet + Specs tab share it; zero content removed | DONE (407/407) | — |
| 6 | polish | 9px ramp fix, close-button affordance, RTL/motion audit, full verify | DONE (409/409) | — |

## Pre-flight interface scan
- T1↔T2 share VehicleCarriageSelector (stepper header vs legend placement). Ruling: T1 owns header structure; T2 adds legend block below header without moving T1's elements. Cost if wrong: one layout rework.
- T1↔T3 share VehicleSeatingDiagram (disclosure wrapper vs button→div swap). Ruling: T1 wraps matrix in disclosure without touching seat controls; T3 changes controls inside. Cost if wrong: merge conflict with self (sequential, so just rework).
- T4↔T5 share VehicleDetailSheet overview/specs regions. Ruling: T4 moves blocks without changing content; T5 extracts shared component. Sequential, no conflict.
- Pre-flight: no parallel execution (single implementer, shared files).

## Ledger
- Setup: working on main with per-task push per user's standing instruction (exec skill prefers worktree; user norm across session is direct-to-main verified pushes). Ruling: follow user norm — cost if wrong: none, pushes are per-task and revertible.
- TDD + verification-before-completion govern every task.

- T1: Ruling: impeccable sub-commands (clarify/colorize/...) are not loadable OpenCode skills; the critique Fix directives serve as the binding spec for each task. Cost if wrong: none, fixes are explicit.
- T1: Ruling: UrbanStandingCabinView left untouched (compact capacity layout, not the overloaded matrix); disclosure applies to reserved-seat matrix only. Cost if wrong: one follow-up if critique disagrees.
- T1: note: pre-existing 9px advisory shifted 956→1019 (stepper insertion); owned by T6 polish.
- T2: detector still reports only the pre-existing 9px advisory (line shifted by insertions); owned by T6.
- T3: Ruling: full offline-state handling out of scope (client sheet, no service worker); covered image-fail + empty-formation + synthesized-data transparency. Cost if wrong: a follow-up harden pass.
- T4: Ruling: seating-tab label kept ("Carriages & Decks") — T1 disclosure now matches the label and renaming costs 6-locale churn for little gain. Cost if wrong: one rename later.
- T6: RTL audit: additions are flex/mirror-safe, separators aria-hidden; chevrons follow house-wide non-mirrored pattern (no rtl: usage anywhere). Motion: no new animation added. Detector now 0 findings on inspector/.
