# Login critique fixes — execution todos (2026-10-25)

Scope: all five login issues P0→P3 + final polish, from critique
`2026-10-25T02-52-55Z__src-app-admin-login-page-tsx.md` (22/40 Acceptable).
User answers: login trust first, one surface fully, environment badges.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | clarify preset identity | Hub sublabel on presets + "Authorizing as {name} — {role} @ {hub}" pre-submit line | DONE (561/561) | — |
| 2 | harden auth guardrails | Attempt-aware errors + client lockout, session-scope line, supervisor contact | TODO | — |
| 3 | polish passkey UX | Show/hide toggle, preserve passkey unless ID changed, caps-lock hint | TODO | — |
| 4 | animate success landing | ~1200ms readable success + "Entering → {surface}" chip from callbackUrl | TODO | — |
| 5 | distill prod/demo identity | ENV badge, demo switcher behind demo flag, drop version tag | TODO | — |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/login/page.tsx; executed sequentially inline so no interface drift. Todo 5's demo-flag gating changes which elements render — todos 1-4 tests must not assume demo switcher visibility in a way todo 5 breaks; ordering (identity last) avoids rework.
- TDD + verification-before-completion loaded and governing.
- Todo 1: role ternary extracted to roleLabelFor (was inline in buttons, now shared with identity line). Ruling: hub rides as a third truncated line in existing 10px style rather than a new size — no new detector size class introduced.
