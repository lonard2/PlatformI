# Transportation bar fixes — todos (each commitable + pushable)

Scope: `src/components/navigation/TransportationSystemBar.tsx` (+ `tsb*`/sector i18n keys ×6 where needed) + one test file per todo. No API changes. User rulings: choice explosion first; all five issues; split control (chip label filters bar, eye toggles map); dead-end taps show a schedule-only toast without closing the tray.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable distill` | Tray chunking: group by wilayah, headway sort, cap initial render with show-all, preserved query | RED→GREEN `tests/chrome-tsb-distill.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | Split visibility control: chip label filters bar, eye toggles map, tooltips explain each; surface auto-collapse | RED→GREEN `tests/chrome-tsb-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable harden` | Collapsed dot+word status (short word, non-NORMAL at minimum) | RED→GREEN `tests/chrome-tsb-harden.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable polish` | Dead-end rows toast schedule-only without closing tray | RED→GREEN `tests/chrome-tsb-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable layout` | Mobile systems row default-open on first visit, correct toggle aria-label, persisted preference | RED→GREEN `tests/chrome-tsb-layout.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.
