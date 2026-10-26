# Timetable tab critique fixes — todos (each commitable + pushable)

Scope: `src/app/admin/timetables/page.tsx` (+ `BatchScheduleModal` / `TimetableMatrixGrid` / `TimetableStringlineChart` only if the todo requires it) + `tt*`/`tb*` i18n keys ×6 + one test file per todo. No API changes, no new routes. User rulings: destructive batch safety first; preview-then-replace (replace stays the confirmed action after explicit Confirm).

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | Rendered error banner with Retry; batch diff-preview (N new / M replaced / K conflicts) with explicit Confirm; surfaced in-cell save failures | RED→GREEN `tests/timetable-harden.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable shape` | Modal in 4 visible sections, sticky footer + dirty dot, close blocked on dirty, `type="time"` inputs | RED→GREEN `tests/timetable-shape.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable animate` | Post-generate summary (trips · span · headway) with Review-on-Stringline action switching view + highlighting new IDs | RED→GREEN `tests/timetable-animate.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable clarify` | Single line-context control, one Add + one Generate label, all strings to `tt*` keys | RED→GREEN `tests/timetable-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable polish` | Final pass: 44px targets + labels, paginated list, visible scroll affordance, leftover keyed copy | RED→GREEN `tests/timetable-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.
