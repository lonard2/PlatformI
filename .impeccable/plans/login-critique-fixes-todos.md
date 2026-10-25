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
| 1 | clarify preset identity | Hub sublabel on presets + "Authorizing as {name} — {role} @ {hub}" pre-submit line | DONE (561/561) | 978c846 |
| 2 | harden auth guardrails | Attempt-aware errors + client lockout, session-scope line, supervisor contact | DONE (564/564) | 6fc4cec |
| 3 | polish passkey UX | Show/hide toggle, preserve passkey unless ID changed, caps-lock hint | DONE (568/568) | a3c0c45 |
| 4 | animate success landing | ~1200ms readable success + "Entering → {surface}" chip from callbackUrl | DONE (570/570) | f31ed08 |
| 5 | distill prod/demo identity | ENV badge, demo switcher behind demo flag, drop version tag | DONE (572/572) | 84f2591 |
| 6 | final review via fresh subagent | Whole-branch review, fix Critical/Important RED→GREEN, ledger minors | DONE (572/572) | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Pre-flight: todos 1-5 all touch src/app/admin/login/page.tsx; executed sequentially inline so no interface drift. Todo 5's demo-flag gating changes which elements render — todos 1-4 tests must not assume demo switcher visibility in a way todo 5 breaks; ordering (identity last) avoids rework.
- TDD + verification-before-completion loaded and governing.
- Todo 1: role ternary extracted to roleLabelFor (was inline in buttons, now shared with identity line). Ruling: hub rides as a third truncated line in existing 10px style rather than a new size — no new detector size class introduced.
- Todo 2: attempt counter in component state; lockout text at >=5, form stays usable (server enforces). Ruling: NO client-side disable/timer lockout — the client cannot enforce it, so it counts and advises instead of pretending; every further rejection re-states the lockout. Session-scope copy verified against the auth route (HTTP-only, 8h maxAge) before writing it.
- Todo 3: toggle is icon-only with aria-label + aria-pressed; input type switches; caps hint via getModifierState on keydown+keyup, cleared on blur; same-ID re-tap preserves, different-ID clears. Ruling: caps-lock test dispatches a real KeyboardEvent with stubbed getModifierState inside act() — fireEvent drops the non-standard property and raw dispatch does not flush; the probe proved the handler correct and only the harness needed fixing.
- Todo 4: landing label maps the 6 known /admin routes to existing admin keys, fallback dashboard; composed into the success sentence (no new chip component). Ruling: the 1200ms timing test drives fake timers from submit — real timers cannot assert a future non-event without waiting it out.
- Todo 5: ENV badge replaces the version tag in the card header (amber DEMO, neutral PRODUCTION); switcher renders only when NEXT_PUBLIC_DEMO_MODE=1. Ruling: secure default — demo hides unless explicitly enabled; devs run with the var set (documented in code comment). Ruling: ENV badge values stay English in all locales — environment tokens, not prose. Existing admin-login tests opt into demo mode explicitly.
- Review ses_e8ef85578ffea8RVHtWvywOZ1j: PASS with minors, no Critical/Important. All four ledger rulings upheld.
Final: minor (deferred): stale failedAttempts closure under double-submit; counter display-only, server authoritative.
Final: minor (deferred): attempt count per-terminal not per-operator; resetting on ID change would let failures hide by toggling.
Final: minor (deferred): preset tap wipes lockout/supervisor guidance via unconditional error clear.
Final: minor (deferred): success sentence punctuation (arrow, trailing period) outside i18n; cosmetics only.
Final: minor (deferred): caps-lock hint misses paste/autofill paths; hint never blocks input.
Final: minor (deferred): unused within/waitFor imports in critique test file.
Final: minor (deferred): lockout test proves end state, not per-iteration sequencing (findByRole resolves on first banner).
Final: minor (deferred): non-/admin callbackUrl fallback label untested.
Final: Ruling: 1200ms dwell is taste, not correctness — the timer test pins whatever value ships; accepted as-is. Cost if wrong: slightly short/long read on success.
Final: Ruling: NEXT_PUBLIC_DEMO_MODE branch coverage via process.env mutation is valid under Vitest; release-build flag state is a deploy concern, verified at deploy, not in unit tests.
Final: Ruling: server-side lockout/auth behavior out of scope — client renders data.error into an escaped React text node; no injection vector introduced here.
Final: Ruling: visual/contrast claims accepted as reported by the browser-enabled critique; this diff introduces no new size or color tokens (verified in review). Cost if wrong: pre-existing 10px/low-contrast findings persist — owned by a future typeset pass.
