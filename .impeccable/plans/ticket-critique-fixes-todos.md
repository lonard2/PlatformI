# Ticket critique fixes — execution todos (2026-10-24)

Scope: all five priority issues + detector micro-type from critique
`2026-10-24T04-27-45Z__src-components-ticketing-intercitytickethub-tsx.md` (21/40).
User answers: mode labels first, all issues, nothing off-limits.

Protocol: ponytail, no emoji, strict TS, zero placeholder stubs, TDD with RED-then-GREEN
where logic exists, verify before every push (`npx tsc --noEmit`, `npm test`,
`impeccable detect --json`, `git diff --check`). One commit + push per todo.
Ledger in this file; rulings inline.

| # | Todo | Scope | Status | Commit |
|---|------|-------|--------|--------|
| 1 | clarify mode labels | Localized labels + terminal hints in hub mode select, enum kept as value; i18n keys ×6 | DONE (502/502) | — |
| 2 | clarify Pay reassurance | 3-way method picker, fare math, reservationCode in success card | DONE (505/505) | — |
| 3 | harden buyer errors | Inline per-field errors + aria-describedby, focus first invalid, visible required markers | DONE (508/508) | — |
| 4 | layout guest lookup | Progressive disclosure: code+phone first, collapsible fallback fields | TODO | — |
| 5 | clarify step-4 summary | Humanized class/seat, masked contact, Edit links to steps 2/3 | TODO | — |
| 6 | typeset micro-type | Three `text-[9px]` usages up to DESIGN.md ramp (or documented exemption) | TODO | — |
| 7 | polish final pass | Whole-path pass per polish.md triage order; detector clean | TODO | — |

## Ledger
- Setup: working on main with per-task push per user standing norm.
- Todo 1: detector 0 on hub file; ja/zh/ko/ar labels are my translations, native check deferred to reviewer. Ruling: short human labels, no terminal-hint optgroups (overengineering). Note: the "All" option text contains no underscore so the no-raw-enum guard holds.
- Todo 2: RED caught a real stale-closure bug (handlePay deps lacked paymentMethod; payload always sent JAKLINGKO). Fixed + covered. Ruling: payload keeps paymentResult success and adds paymentMethod; server ignores unknown keys (verified read of route). Note: success-block method label uses render-scope value, payload verified via debug fetch log (since removed).
- Todo 3: per-field errors are plain paragraphs (no extra live regions beyond the existing summary alert). Ruling: required marker is a visual asterisk only; screen readers already hear the required attribute. ID marker follows rules.idRequired.
