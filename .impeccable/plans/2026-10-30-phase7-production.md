# Phase 7 — Production readiness — SHELVED (2026-10-30)

Parker decision: revisit once features are more complete and the app is
ready for public deployment. Task 0 (audit) and the Task 1 config
hardening that needed no hosting/PSP/roster answers are DONE and
shipped; everything requiring those three decisions stays parked.

Shipped: `fd19a7f` (audit), `77d6083` (config hardening).
Parked: Dockerfile/CI per hosting target, PSP adapter, operator
provisioning mechanism, data-durability runbook, observability minimum,
go-live checklist.

**Goal:** the codebase can ship to real users without inventing anything
at deploy time — secrets, operators, money, data, and observability are
all explicit, and a go-live checklist proves it.

**Conventions (all tasks):** TDD RED→GREEN where logic exists; strict TS,
no `any`; zero emoji; each task = own commit + push to `origin main`;
verify (`npx tsc --noEmit`, `npm test`, `next build`,
`impeccable detect --json`, `git diff --check`); 6-locale parity on
user-copy changes; `dev.db` never committed.

## Baseline (2026-10-30)

- No Dockerfile, no CI workflows, no monitoring, no backup story; the
  only Postgres is a local docker-compose with hardcoded dev credentials.
- Demo operator credentials fail closed in production (Phase 4) — which
  means **no operator can log in to production today**. Provisioning is
  the critical path.
- Money runs on manual OCC-confirmed settlement (Phase 3); the
  `PaymentProvider` seam exists but no PSP adapter does.
- GTFS refresh runs as an in-app runner; no production schedule, no
  backup/restore runbook (`docs/database.md` covers local setup only).

## Decisions required from the partner (blocking Tasks 1–3)

1. **Hosting target** (Vercel / VPS+Docker / other) — determines the
   Dockerfile/CI shape in Task 1.
2. **PSP choice** (Midtrans / Xendit / other) — determines the Task 3 adapter.
3. **Operator roster source** (env JSON / provisioned DB seed / SSO) —
   determines the Task 2 mechanism.

Until these land, Tasks 0 and 5 (audit + checklist scaffolding) can
proceed; Tasks 1–4 stay parked rather than guessing.

---

### Task 0: Production-readiness audit

**Files:**
- Modify: none (read-only) — output is the verdict table in this plan's ledger.
- Test: none; evidence = file:line pointers.

Walk every secret, credential, hardcoded URL/key, and fail-open default:
`ADMIN_AUTH_SECRET`/`NEXTAUTH_SECRET`/`MEMBER_AUTH_SECRET` handling,
`OPENROUTER_API_KEY` exposure, local PG password, `NEXT_PUBLIC_*` key
leakage, demo-operator paths, CORS/fetch surfaces, error payloads that
leak internals (`details: (err as Error).message` in API 500s). Record
per item: safe / fix-in-Task-1 / accepted-risk-with-reason. No code.

- [ ] **Step 1:** audit, fill the ledger table below.
- [ ] **Step 2:** commit — `docs(production): readiness audit` + push.

### Task 1: Production configuration + provisioned operators

**Files:**
- Modify: env template (`.env.example`), boot-time config validation
  (fail-closed on missing production secrets), operator provisioning
  (per Decision 3), Dockerfile + CI workflow (per Decision 1).
- Test: `tests/prod-config.test.ts` — boot validation rejects missing
  secrets in production; accepts complete config; demo catalog stays
  refused (extends the Phase 4 test, does not replace it).

**Interfaces:**
- Consumes: `getAuthSecret` fail-closed precedent, `REGISTERED_OPERATORS`.
- Produces: `npm run build` + `prisma db push` work from env alone; no
  plaintext credential ships.

- [ ] **Step 1–5:** standard loop. Commit — `feat(deploy): production configuration` + push.

### Task 2: Data durability

**Files:**
- Modify: backup/restore runbook (`docs/database.md` extension or new
  `docs/ops-runbook.md`), PG backup wiring for the chosen host, GTFS
  refresh scheduling in production, seed-vs-migrate discipline
  (`prisma migrate` vs `db push` decision recorded).
- Test: restore drill on a scratch database (documented, not automated).

- [ ] **Step 1–5:** standard loop. Commit — `docs(ops): data durability runbook` + push.

### Task 3: First PSP adapter behind the provider seam

**Files:**
- Modify: `src/lib/ticketing/<psp>Provider.ts` implementing
  `PaymentProvider` (per Decision 2), webhook signature verification for
  that PSP, provider selection wiring (manual stays default until the
  adapter is proven — same proven-first rule as the money rollout).
- Test: provider unit tests (charge/confirm/refund/idempotency) +
  webhook signature tests; reuse the Phase 3 envelope suite.

- [ ] **Step 1–5:** standard loop. Commit — `feat(payments): <psp> adapter` + push.

### Task 4: Observability minimum

**Files:**
- Modify: `/api/health` (DB + migration-status checks), structured
  request/error logging with secret redaction, log-policy note in the
  ops runbook.
- Test: health endpoint tests (healthy/degraded/unhealthy); redaction
  unit test with a fake secret.

- [ ] **Step 1–5:** standard loop. Commit — `feat(ops): health checks and redacted logging` + push.

### Task 5: Go-live checklist + verification

**Files:**
- Modify: `docs/go-live.md` — ordered checklist (config → migrate →
  provision → smoke auth/money/flags → demo-mode-off proof → rollback
  pointers), each item with its verify command.
- Test: none new; the checklist re-runs the full gates
  (`tsc`, suite, build, detector) plus prod-config dry checks.

- [ ] **Step 1–5:** write, self-review against Tasks 0–4, commit —
  `docs(ops): go-live checklist` + push.

---

## Self-Review

1. **Spec coverage:** every production gap maps — secrets/operators →
   Tasks 0–1; data loss → Task 2; manual-only money → Task 3; blind
   ops → Task 4; unproven launch → Task 5.
2. **Out of scope:** new product features, new regions/data, native apps,
   analytics platform (unchanged non-goals).
3. **Review focus:** Task 0 must not prescribe fixes (audit only);
   Tasks 1–3 must not guess the three partner decisions — park, don't
   invent.
4. **Proportion:** plan names interfaces + gates, no bodies.

## Ledger

### Task 0 audit verdicts (2026-10-30, read-only)

| # | Item | Verdict |
|---|------|---------|
| 1 | `ADMIN_AUTH_SECRET`/`NEXTAUTH_SECRET`, `MEMBER_AUTH_SECRET` | SAFE — fail-closed in production (`getAuthSecret`, `getMemberAuthSecret` throw; no fallback). |
| 2 | `OPENROUTER_API_KEY` vs `NEXT_PUBLIC_OPENROUTER_API_KEY` | FIX (Task 1) — server falls back to a `NEXT_PUBLIC_` var; anyone setting it for the server ships the key in the client bundle. Drop the public fallback. |
| 3 | `NEXT_PUBLIC_CARTO_API_KEY` | SAFE by design — public tile key with keyless OSM fallback (`TransitMap.tsx:139-154`); document, don't gate. |
| 4 | `NEXT_PUBLIC_DEMO_MODE` | SAFE — display-only (login presets hidden in prod); demo logins refused server-side regardless. |
| 5 | API 500 `details: err.message` (21 sites) | FIX (Task 1) — internal messages leak to clients; strip `details` when `NODE_ENV=production`. |
| 6 | Demo operator credentials in production | SAFE — refused at `authenticateOperator` (Phase 4 test pins it). |
| 7 | Middleware accepts `x-operator-token`/Bearer but route gates read cookies only | FIX (Task 1) — header-authed `/api/alerts` writes pass middleware then 401 at the route. Teach `requireOperator` the same token sources or remove header support. |
| 8 | Hardcoded `HTTP-Referer: https://platformi.id` | ACCEPT — cosmetic provider header; revisit when the domain is provisioned. |
| 9 | Docker PG `platformi/platformi` + port 5433 | FIX (Task 1) — dev-only credentials must come from env with no committed default for prod compose. |
| 10 | No Dockerfile / CI / monitoring / backup | PARKED — Tasks 1–4. |
| 11 | Anonymous purchase POST row spam (no throttle; idempotency is opt-in) | ACCEPT with mitigation — heuristic replay dedupes real buyers; edge rate-limiting goes on the go-live checklist (Task 5) until identity-based throttling is scoped. |
