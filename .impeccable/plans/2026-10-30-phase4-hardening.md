# Phase 4 — Hardened writes + admin gaps

**Goal:** every state-changing route proves its caller; list endpoints paginate; leftover modeling questions get a recorded decision, not new code where the model already exists.

**Conventions (all tasks):** TDD RED→GREEN per task; strict TS, no `any`; zero emoji; each task = own commit + push to `origin main`; verify (`npx tsc --noEmit`, full suite, `impeccable detect --json`, `git diff --check`); 6-locale parity on user-copy changes; `dev.db` never committed.

## Audit baseline (2026-10-30)

Write routes with **no caller check at all**: alerts POST/PATCH/DELETE, fleet POST/PUT/DELETE, network lines/stops/regions/timetables POST/PUT/DELETE, intercity operators + boarding-points POST/PUT/DELETE, crowdsource DELETE (anyone can delete any check-in). Crowdsource POST is guest-allowed by design (rate-limited, member-weighted). Members trips/claim, finance, refund, webhook are gated (Phases 2.5–3). AI assistant POST is a public proxy to the server OpenRouter key. No list endpoint paginates. Demo operator credentials (`admin123` etc.) authenticate in production.

Already-modeled (verify, don't rebuild): transport-bar grouping reads store `allLines` (DB-backed); skybridge guide + hub sheets exist; multi-region authoring + empty states per `docs/multi-region.md`.

---

### Task 1: Operator authZ on OCC authoring writes + crowdsource DELETE

**Files:**
- Modify: `src/app/api/alerts/route.ts`, `src/app/api/fleet/vehicles/route.ts`, `src/app/api/network/{lines,stops,regions,timetables}/route.ts`, `src/app/api/intercity/{operators,boarding-points}/route.ts`, `src/app/api/crowdsource/checkin/route.ts` (DELETE only), `src/lib/services/adminAuthService.ts` (demo credentials non-production-only)
- Test: `tests/authoring-authz.test.ts`

**Interfaces:**
- Consumes: `requireOperator` (Phase 3).
- Produces: every authoring mutation requires an authenticated operator (any role; finance gates stay on money); GETs stay public. Demo credential catalog refuses in production (fail closed, explicit error); production requires env-configured secret (already fail-closed).

- [ ] **Step 1: Write the failing test**
  - POST/PATCH/PUT/DELETE without cookie → 401; garbage token → 401; on each of the 8 surfaces + crowdsource DELETE. Authenticated operator → success path unchanged. Demo credential login in `NODE_ENV=production` → refused.
- [ ] **Step 2: Run test to verify it fails** — `npx vitest run tests/authoring-authz.test.ts`, expected FAIL (open writes).
- [ ] **Step 3: Implement** — shared gate helper on `requireOperator`; keep GETs public; crowdsource POST untouched.
- [ ] **Step 4: Verify** — new test + `tsc` + full suite.
- [ ] **Step 5: Commit** — `feat(security): operator auth on OCC authoring writes` + push.

### Task 2: Member-gate the AI assistant proxy

**Files:**
- Modify: `src/app/api/ai/assistant/route.ts`
- Test: extend `tests/authoring-authz.test.ts` or `tests/ai-assistant-auth.test.ts`

**Interfaces:**
- Consumes: `requireMember`. Produces: POST without member session → 401 even for the local fallback (the endpoint is keyed compute, not public data); GET (capability/model list) stays public.

- [ ] **Step 1–5:** same loop. Commit: `feat(security): member auth on AI assistant`.

### Task 3: Pagination on list endpoints

**Files:**
- Modify: GET handlers in alerts, fleet, network lines/stops/timetables, intercity operators/boarding-points (and members trips if unbounded).
- Test: `tests/list-pagination.test.ts` — `?page=&pageSize=` honored, pageSize capped, response carries `{ items, page, pageSize, total }` (or backward-compatible extension), defaults preserve current admin-board behavior.

- [ ] **Step 1–5:** same loop. Commit: `feat(api): paginate list endpoints`.

### Task 4: Verify-only sweep + decision notes

**Files:**
- Modify: `docs/multi-region.md` (only if a gap is found) or a short `docs/phase4-decisions.md`.
- Test: `tests/phase4-modeling.test.ts` — transport bar groups from DB-backed lines; empty region renders honest empty state; skybridge guide renders from data (no invented transfers).

- [ ] **Step 1–5:** same loop, expecting mostly-GREEN on first run (proof, not build). Commit: `docs(phase4): record modeling decisions with test evidence`.

---

## Self-Review

1. **Spec coverage:** every Phase 4 design-doc bullet maps — authN/authZ writes → Tasks 1–2; pagination → Task 3; transport-bar grouping / hub-skybridge-uptime / cross-region → Task 4 verify sweep. Demo-mode explicitness → Task 1 (demo creds fail closed in prod).
2. **Out of scope:** new money movement (Phase 3 done), new regions/lines data (never invent), UI redesigns.
3. **Review focus:** Task 1 test must hit every mutation verb on every surface; Task 3 defaults must not break admin boards; Task 4 must produce a written decision per item.
4. **Proportion:** plan names interfaces + test files, no bodies.
