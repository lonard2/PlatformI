# Gate sim critique fixes — todos (each commitable + pushable)

Scope: `src/components/ticketing/DigitalPassWallet.tsx` only (plus ticketing i18n keys ×6 + one test file per todo). No API changes, no new routes, no design-system churn.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` | Offline/network catch reports explicit DENY, preserves QR (no status mutation), Retry Tap button reuses same scanType | RED→GREEN `tests/gate-sim-harden.test.tsx`, `tsc`, full suite, `detect --json` on target, `diff --check` |
| 2 | `$impeccable clarify` | Untruncated result with role/aria-live, passenger verbs, TAP enablement from `resolveQrStatus` with inline reasons | RED→GREEN `tests/gate-sim-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |
| 3 | `$impeccable distill` | ACTIVE tab scannable-only; WAITING/FAILED move to Pending disclosure with actions; TAP block pinned above fold | RED→GREEN `tests/gate-sim-distill.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |
| 4 | `$impeccable polish` | Tab semantics (tablist/tab + selected), 44px targets, single Ticket prefix, type ramp, station fallback label | RED→GREEN `tests/gate-sim-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.
