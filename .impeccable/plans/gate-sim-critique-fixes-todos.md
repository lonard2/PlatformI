# Gate sim critique fixes — todos (each commitable + pushable)

Scope: `src/components/ticketing/DigitalPassWallet.tsx` only (plus ticketing i18n keys ×6 + one test file per todo). No API changes, no new routes, no design-system churn.

| # | Action | Fix | Verify |
|---|--------|-----|--------|
| 1 | `$impeccable harden` — DONE (`72f876e`, 646/646) | Offline/network catch reports explicit DENY, preserves QR (no status mutation), Retry Tap button reuses same scanType | RED→GREEN `tests/gate-sim-harden.test.tsx`, `tsc`, full suite, `detect --json` on target, `diff --check` |
| 2 | `$impeccable clarify` — DONE (`3fb2b06`, 649/649) | Untruncated result with role/aria-live, passenger verbs, TAP enablement from `resolveQrStatus` with inline reasons | RED→GREEN `tests/gate-sim-clarify.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |
| 3 | `$impeccable distill` — DONE (`ecdcdc8`, 651/651) | ACTIVE tab scannable-only; WAITING/FAILED move to Pending disclosure with actions; TAP block pinned above fold | RED→GREEN `tests/gate-sim-distill.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |
| 4 | `$impeccable polish` — DONE (`f806bdf`, 655/655) | Tab semantics (tablist/tab + selected), 44px targets, single Ticket prefix, type ramp, station fallback label | RED→GREEN `tests/gate-sim-polish.test.tsx`, `tsc`, full suite, `detect --json`, `diff --check` |

Rules per todo: minimal diff, no overengineering, no regressions, strict TS, zero emoji, 6-locale parity when keys change.

Ruling: distill reused existing keys only (hubPayNow, guestLookupFallbackTitle) — one new key (gatePendingIssues ×6). wallet pending Pay buttons share the hub label, so the hub pay test now matches the fare-suffixed hub button (`/pay now ·/`); m4 tab queries moved from button to tab role after the semantics fix.
Ruling: gateTapInSim/gateTapOutSim left as dead keys (R3 precedent) — catch path no longer references them.
