# Fleet critique fixes ROUND 2 — execution todos (2026-10-26)

Scope: all fleet issues P0→P2 + final polish, from critique
`2026-10-25T02-52-55Z__src-app-admin-fleet-page-tsx.md` (26/40 Acceptable).
Prior round (2026-10-25, 21/40 critique) is archived in
`.impeccable/plans/fleet-critique-fixes-todos.md` — untouched by this run.
User answers: bulk safety first, single aggregate undo, all issues.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | harden bulk ops | Bulk-hold confirm dialog (delete-confirm idiom) + single aggregate undo entry | DONE (615/615) | be3981d |
| 2 | clarify sort + legend | Needs-attention-first status ordering, color legend for amber collision | DONE (617/617) | — |
| 3 | distill coupling callout | Inline coupling microcopy at status control + telemetry modal callout | TODO | — |
| 4 | quieter focus + finalizer | Stop per-row focus steal, fleet single-shot finalizer mirroring alerts | TODO | — |
| 5 | layout empty/loading/mobile | Empty state + Clear filters, skeleton rows, 24px checkboxes, frozen columns | TODO | — |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/fleet/page.tsx; executed sequentially inline so no interface drift. Todo 1's aggregate undo consumes handleUpdateStatus/handleUpdateCrowd paths; todo 4 removes their per-row focus steals — todo 4 must preserve the bulk-bar focus contract todo 1 relies on. Ruling recorded under todo 4.
- TDD + verification-before-completion loaded and governing.
- Todo 1: selects only stage intent (eligible = would-change); confirm shows count/lines/target with Tab trap + Escape + focus restore; Apply runs silent per-vehicle mutations under one DESTRUCTIVE (status, 15s) or short (crowd, 5s) aggregate undo; superseded per-vehicle undos are dropped with the apply (mirrors escalate-clears-pending-mutation precedent). Ruling: failed PUTs still surface per vehicle — aggregate undo never implies aggregate sync.
- Todo 2: status sort is HOLD > OUT > BOARDING > APPROACHING_STOP > IN_SERVICE with code tiebreak; legend reuses existing scale labels (zero new copy keys) with dots matching table chips. Ruling: APPROACHING_STOP ranks between BOARDING and IN_SERVICE (dwell-adjacent, not free-flowing); it never appears in the edit selects, only from simulation. Ruling: sort option label renamed (fleetSortStatus text changed in all 6 locales) so the control promises triage, not alphabet.
- Todo 3: row caption renders only on non-IN_SERVICE rows (short key); table footnote deleted; modal note became a bordered amber callout with testid. Ruling: superseded round-1 footnote test deleted rather than adapted — adapting it would assert a UI that no longer exists; the 3 new tests cover the replacement behavior. Ruling: detector flagged the callout border-l-2 as side-tab slop, so the callout uses a full subtle border instead — detector stays at 0 by design, not by suppression.
