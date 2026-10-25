# Alerts critique fixes — execution todos (2026-10-25)

Scope: all five priority issues from critique
`2026-10-25T02-03-17Z__src-app-admin-alerts-page-tsx.md` (23/40 Acceptable).
User answers: P0s first, all five issues, labeled Delete button.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | layout broadcast confirm as modal | alertdialog overlay out of grid flow, focus trap, restated blast radius + verb button | DONE (538/538) | — |
| 2 | harden undo live-regions | Announce once on create/finalize; ticking countdown aria-hidden + live off | TODO | — |
| 3 | clarify delete control | Labeled Delete text button, wider gap from Resolve | TODO | — |
| 4 | colorize amber collision + copy bug | Reserve amber for WARNING; re-theme delete-undo + fleet-restore; fix demote INFO→WARNING; severity legend row | TODO | — |
| 5 | audit empty/filter/sync honesty | Empty state + CTA, skeleton rows, status/severity/line filter + search, aggregate sync toasts, disclose 10-run cap | TODO | — |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm (established in fleet/ticket/portal sessions; push to shared main is the norm here, not an ask-first side effect).
- Pre-flight: todos 1-5 all touch src/app/admin/alerts/page.tsx; executed sequentially inline so no interface drift. Todo 4's undo re-theme must not clash with todo 2's live-region change (different attributes: classes vs aria) — checked, no conflict. Todo 5 consumes the sync aggregation paths but changes no interfaces earlier todos need.
- TDD + verification-before-completion loaded and governing.
- Todo 1: modal lives after the grid (fixed overlay, backdrop-click + Escape close, Tab trap, autofocus retained). Ruling: confirm button reuses publishAlert verb key instead of a new i18n key — the verb already exists in all 6 locales and means the same action. Existing admin-ops-safety tests updated to alertdialog (they encoded the old role=alert behavior the critique condemned).
