# Network studio critique fixes — todos (each commitable + pushable)

Scope: `src/app/admin/network/page.tsx` + `net*` i18n keys ×6 + one test file per todo. No API changes, no new routes. User rulings: destructive safety first; stage everything (stop drag/reorder/delete join the staged model — nothing goes live before Publish).

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | In-app delete modal (affected counts, type-to-confirm for lines); stop drag/reorder/delete staged locally; 10s undo with rollback | RED→GREEN `tests/network-studio-harden.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | Single staged-changes bar with diff counts, Publish All + Discard, persistent last-published receipt | RED→GREEN `tests/network-studio-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable layout` | Mobile List/Map switcher, 44px stop-row targets, scrollable modals | RED→GREEN `tests/network-studio-layout.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable distill` | Toolbox progressive disclosure, disable-with-hint preconditions, RAIL modes grouped by family | RED→GREEN `tests/network-studio-distill.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable polish` | Final pass: dialog semantics, icon-button labels, empty/filter states | RED→GREEN `tests/network-studio-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.

Ruling (polish): low-contrast pairs from the overlay (#62748e on #0a0f1d, #ffffff on #0092b8) deliberately untouched — re-tokenizing slate/cyan ramps is a design-token decision, not a one-line fix; text was ramped to the 12px floor and semantics added instead.
