# Phase 6 — Modernization

**Goal:** finish the upgrade the dep-upgrade phase parked, close the
critique-todo remainder honestly (doing or documenting-exempt, no silent
drops), and leave the build warning-free.

**Conventions (all tasks):** TDD RED→GREEN where logic exists (pure
helpers/validators get RED-first tests; copy moves verified by suite +
parity test); strict TS, no `any`; zero emoji; each task = own commit +
push to `origin main`; verify (`npx tsc --noEmit`, `npm test`,
`next build`, `impeccable detect --json`, `git diff --check`); 6-locale
parity on user-copy changes; `dev.db` never committed.

## Baseline (2026-10-30)

- Deps are current (Next 16, React 19, Tailwind v4 installed, TS 7,
  Prisma 7, Vitest 5) but Tailwind runs in **compat mode**
  (`tailwind.config.ts` via `@config`, `darkMode: "class"`) — the
  CSS-first `@theme` rewrite is parked (dep-upgrade Todo 2).
- Six todo files still show open rows, but at least the portal ledger
  describes Todos 2/3/5/6 as completed while the table still says TODO.
  Tables are stale somewhere; nothing gets closed without evidence.
- Known build wart: Turbopack whole-project-tracing warning on `db.ts`
  (left as-is in the upgrade ledger, non-fatal).

---

### Task 0: Reconcile the todo remainder

**Files:**
- Modify: the six `*-todos.md` tables (status column only).
- Test: none (no behavior change); evidence = code pointers per row.

**Interfaces:**
- Consumes: nothing. Produces: a verified open-item list that Tasks 1–4
  execute against; stale DONEs closed with file:line evidence in the ledger.

For each row still marked TODO — dep-upgrade #2; fleet-round2 #3;
homepage-cycle13 #1; i18n B2/D2/E1; portal #2/#3/#5/#6; ticket #6 —
open the code, decide DONE (with evidence) vs genuinely open, and update
the table + ledger. Genuinely-open items move into Tasks 1–4 below;
anything already complete is closed, not re-done.

- [ ] **Step 1:** walk the rows, record verdicts in this plan's ledger section.
- [ ] **Step 2:** update the six tables.
- [ ] **Step 3:** commit — `docs(modernization): reconcile open todo remainder` + push.

### Task 1: Tailwind v4 CSS-first theme

**Files:**
- Modify: `tailwind.config.ts` (remove or shrink to true compat needs),
  global CSS (`@theme` tokens for brand colors, fonts, dark variant),
  any `dark:`/arbitrary-value fallout.
- Test: `npm test` + `next build` + visual smoke of homepage, admin
  shell, wallet (existing suite + detector; no new test file unless a
  token helper is introduced, then unit-test it).

**Interfaces:**
- Consumes: current utility usage. Produces: identical rendered output
  with the config shim gone; `darkMode: "class"` behavior preserved via
  the v4 dark variant.

- [ ] **Step 1–5:** standard loop. Commit — `style(tailwind): CSS-first v4 theme` + push.

### Task 2: i18n audit closure (B2/D2/E1, if genuinely open)

**Files:**
- Modify: `src/lib/i18n/dictionaries/*`, `src/lib/i18n/types.ts`,
  plus the render sites B2 (system-bar), D2 (network/timetables/meta/
  matrix/modes/SIM_SPEED), E1 (inspector enums/gallery).
- Test: existing `tests/i18n-parity.test.ts` + suite.

- [ ] **Step 1–5:** standard loop (copy moves need no RED file; parity +
  suite are the gate). Commit — `feat(i18n): close audit remainder` + push.

### Task 3: Portal + ticket + fleet leftovers (if genuinely open)

**Files:**
- Modify: portal login/broadcast/health/micro-type sites, ticket
  `text-[9px]` sites, fleet coupling callout, homepage map-chrome
  (CARTO key + OSM fallback + tile-error boundary + focus rings).
- Test: extend the owning spec files (portal/ticket/fleet/homepage) —
  RED first for behavior (confirm dialog, DENIED persistence, fallback
  tiles), suite-gated for copy/type ramp.

- [ ] **Step 1–5:** standard loop. Commit per surface
  (`fix(portal|ticket|fleet|homepage): …`) + push each.

### Task 4: Build hygiene

**Files:**
- Modify: `src/lib/db.ts` import tracing (Turbopack warning), any new
  detector findings from Tasks 1–3.
- Test: `next build` clean + `impeccable detect --json` empty on touched
  lines; full suite green.

- [ ] **Step 1–5:** standard loop. Commit — `chore(build): warning-free production build` + push.

---

## Self-Review

1. **Spec coverage:** every parked modernization item maps — v4 theme →
   Task 1; i18n B2/D2/E1 → Task 2; portal/ticket/fleet/homepage rows →
   Task 3; Turbopack warning + detector → Task 4. Stale-table risk is
   contained by Task 0.
2. **Out of scope:** redesigns, new features, data backfills, the
   production-readiness phase (separate plan).
3. **Review focus:** Task 1 must prove zero visual regression (build +
   suite + smoke, not just compile); Task 0 verdicts need file:line
   evidence, not memory.
4. **Proportion:** plan names interfaces + gates, no bodies.

## Ledger

- Task 0 (2026-10-30): 9 rows verified DONE with file:line evidence (portal #2/#3/#5/#6, ticket #6, fleet-round2 #3, homepage-cycle13 #1, i18n B2/D2); tables + ledgers updated. Genuinely open: dep-upgrade #2 (Tailwind CSS-first → Task 1), i18n E1 (render-site audit → Task 2), network-page error-fallback localization residue (→ Task 2), TimetableMatrixGrid `text-[9px]` (→ Task 3).
