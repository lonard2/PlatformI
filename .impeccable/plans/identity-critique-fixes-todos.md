# Identity critique fixes — todos (each committable + pushable)

Critique 2026-10-29: 14/40 Poor (first run, no trend yet).
User rulings: freeze + error mapping first; all five issues; auto-verified stays.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | P1: per-action busy states, aria-live ceremony status, 60–90s client timeout with exact next steps | RED→GREEN `tests/member-account-panel.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 2 | `$impeccable clarify` | P1: map server error codes to guidance (unknown phone → switch to Register with name kept; duplicate → switch to Continue; expired/network → try again, form intact) | RED→GREEN `tests/member-account-errors.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 3 | `$impeccable harden` | P0-conditional: prod-build dismissal repro note + attach discarded `useDialogFocusTrap` return (autofocus + Tab trap) | RED→GREEN `tests/settings-focus-trap.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 4 | `$impeccable shape` | P2: "Link a ticket" form in panel with TICKET_NOT_FOUND/ALREADY_CLAIMED messaging; enriched history rows; view-all/count | RED→GREEN `tests/member-link-ticket.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 5 | `$impeccable polish` | P2: focus-visible rings on all Account controls; role=alert on errors; visible labels; delete-confirm for saved trips | RED→GREEN `tests/member-account-a11y.test.tsx`, `tsc`, full suite, `detect --json`, `diff-check` |
| 6 | `$impeccable polish` | Final pass if needed, then re-run `$impeccable critique` on the identity surface to confirm score movement (baseline 14/40) | `detect --json`, `diff-check`, commit + push |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale i18n parity for new keys. Each todo ships as its own commit + push to `origin main`.
