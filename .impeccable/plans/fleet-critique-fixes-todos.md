# Fleet critique fixes — execution todos (2026-10-25)

Scope: all five priority issues from critique
`2026-10-24T06-12-15Z__src-app-admin-fleet.md` (21/40 Acceptable).
User answers: delete safety first, all issues, nothing off-limits.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | harden delete safety | In-app destructive confirm, longer undo for add/delete, inline API failure with retry | DONE (525/525) | 5aab68f |
| 2 | harden sync visibility | Header-linked sync with last-sync timestamp, explicit Sync now, pending-changes indicator | DONE (528/528) | 6e5c1a5 |
| 3 | layout bulk operations | Row checkboxes + bulk status/crowd bar, sort by code/line/speed/status | DONE (531/531) | 9795306 |
| 4 | clarify couplings + defaults | Visible status/speed coupling, pre-submit summary with duplicate-code warning | DONE (534/534) | 1d33be5 |
| 5 | polish final pass | Whole fleet-surface pass; detector clean; final review via fresh subagent | DONE (536/536) | ac03d6b |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos share fleet/page.tsx; executed sequentially inline so no interface drift. Todo 4 consumes no interfaces from earlier todos.
- TDD + verification-before-completion loaded and governing; craft-floor + clarify/harden/layout/typeset/polish references read.
- Todo 1: confirm lives in the row/modal (no new route); undo windows are named constants. Ruling: failed-sync banner has Retry but no dismiss — an unresolved sync must stay visible, not be hideable. Modal delete goes through the same confirm state as the row.
- Todo 2: syncFleet is the single pull path (mount + button) with lastSyncAt/pull-count/error in header; pending badge counts failedSyncs only, not undoable edits. Ruling: successful pulls update timestamp even with 0 new — the timestamp answers truth, the count answers delta.
- Todo 3: bulk reuses single-row status/crowd paths (undo + shift-log + sync-failure per vehicle); selection survives apply so holds chain into crowds. Ruling: default board order is code-asc for deterministic triage, not dataset order.
- Todo 4: coupling note lives under the table and in the telemetry modal (same key, both visible). Ruling: duplicate codes block submit (disabled + guard) rather than warn-and-merge — forking the board from SQLite is the worse failure. Summary derives capacity with the same generator calls as commit, so preview cannot drift.
- Todo 5 (fresh review ses_e8f3eec2effewencDzhL9RyZzl: Needs work, minor): fixed 1-3 (undo-restore PUTs route via reportSyncFailure; delete/undo read live store via getState; bulk bar takes focus once via later rAF), plus 4 (row selects keep sr-only label only), 5 (trapTabInConfirm on both inline confirms), 6 (modal delete clears lastTriggerRef), caption + aria-hidden icons. Ruling: review nit about pre-first-sync Syncing placeholder left as-is — sync starts on mount so the text is true. Residuals (not implemented): crowd control in telemetry modal, mode-aware coachbuilder/chassis labels for aviation-maritime, telemetry slider PUT debounce.
