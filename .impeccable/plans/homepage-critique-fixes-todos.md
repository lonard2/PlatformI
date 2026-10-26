# Homepage critique fixes — todos (each commitable + pushable)

Scope: `src/app/page.tsx` (+ homepage copy keys ×6 where needed; wallet/hub components only if the todo requires it) + one test file per todo. No API changes, no new routes. User rulings: mobile sheet first; all five issues; no-route offers multi-leg options with AI provenance labelled.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable layout` | Journey answer as top sheet (or 55–60vh sheet + drag handle) on `<sm`; collapse to summary after resolve | RED→GREEN `tests/homepage-layout.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | Pill keeps Find Route label + text status; multi-leg no-route CTA with AI provenance; success CTA secondary | RED→GREEN `tests/homepage-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable harden` | Fare-to-confirm with reason + Check-pass-options into wallet with route context | RED→GREEN `tests/homepage-harden.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable typeset` | 12–13px semibold high-contrast metrics, valid chip padding, coverage to 11px with icon | RED→GREEN `tests/homepage-typeset.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable polish` | Final pass: leftover copy keys, live-region discipline, focus/swap target fixes | RED→GREEN `tests/homepage-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.

Ruling (harden): detector flags 1 advisory design-system-color in TicketPurchaseModal.tsx, verified pre-existing at HEAD (not introduced here); left untouched.
Ruling (harden): modal line-sync fix — the purchase modal now derives its line from initialOriginStopId so prefilled IDs always match an option; previously the line stayed on the default and prefilled IDs matched nothing.
