# Timetable deferred minors — todos (each commitable + pushable)

Scope: `src/app/admin/timetables/page.tsx` (+ `tt*` i18n keys ×6 where needed) + one test file per todo. No API changes. Each todo: RED→GREEN, `tsc`, full suite, `detect --json`, `diff-check`, own commit + push.

| # | Defer | Fix | Verify |
|---|-------|-----|--------|
| 1 | Category pills keep py-1.5 targets | 44px pill targets (min-h + centered) | RED→GREEN `tests/timetable-defers-pills.test.tsx` |
| 2 | Low-contrast pairs left for a token pass | Targeted bumps: slate-500→400 body text, white-on-cyan CTA darkened to pass, rose alert text lightened — page only, no token renames | RED→GREEN `tests/timetable-defers-contrast.test.tsx` (computed ratios ≥ 4.5) |
| 3 | ttConfirmRemove word-order fragility | Replace `window.confirm` with in-app delete modal (structured identity lines, no interpolated sentence); keep Undo banner | RED→GREEN `tests/timetable-defers-delete.test.tsx` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.
Ruling: ttConfirmRemove is now a dead key (in-app modal replaced window.confirm); left per R3. Overlay white-on-cyan instance lives outside page.tsx (matrix/batch children), out of scope here.\n