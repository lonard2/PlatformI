# Phase 0: Postgres Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run PlatformI on Postgres in dev/prod while keeping SQLite as the fast test database, with zero changes to the 15 existing `db` importers.

**Architecture:** Split the single-provider schema into shared model files plus one datasource file per provider (selection via `--schema` flag and `DATABASE_URL` scheme); `src/lib/db.ts` picks the driver adapter (better-sqlite3 vs `pg` Pool) from the URL at runtime. No model changes — the schema uses only portable types (`cuid()` ids, `String`/`Int`/`Float`/`Boolean`/`DateTime`, no `@db.*` natives).

**Tech Stack:** Prisma 7.10.1 (`@prisma/adapter-better-sqlite3` kept, `@prisma/adapter-pg` + `pg` added), Postgres 16 (docker compose for local, Neon-compatible URL for hosted), vitest 5.0.5, `tsx` seeds.

**Spec:** `docs/superpowers/specs/2026-10-29-platformi-robustness-design.md` (Phase 0 section + Q3 decision: Postgres is the production store, SQLite stays as test DB).

## Global Constraints

- Zero placeholder stubs; zero emojis (Lucide only); strict TypeScript, no `any`.
- TDD with RED-then-GREEN per task; each task ships as its own commit + push to `origin main`.
- Verify before every push: `npx tsc --noEmit`, `npm test`, `impeccable detect --json` on touched files, `git diff --check`.
- 6-locale i18n parity when keys change (no key changes expected in this plan).
- No invented data; `dev.db` ignored and untouched by commits.
- Shared `dev.db` test norm: tests that POST real rows DELETE them in `afterEach` (m1 audit asserts exact counts).

## Review Focus

- `file:./dev.db` vs `file:./prisma/dev.db` misrouting: a bare relative URL must still resolve under `prisma/` per `resolveSqliteFile()` (pinned by an added case in Task 2's test).
- `pg` Pool lifecycle in scripts: seed/migration scripts must end the pool or the process hangs (pinned by Task 4's `finally pool.end()` plus a seed exit-code assertion).
- Smoke-test leftovers must never pollute shared state (pinned by Task 4's create-then-delete in `finally`). Full seed idempotency belongs to the Phase 1 pipeline plan, not here.
- Adapter/URL mismatch (e.g. `postgres://` URL with sqlite adapter) must throw a clear error, never silently connect elsewhere.
- Migration drift between providers: both schema files must validate and generate; models stay in exactly one shared location.

## File Structure

- Modify: `prisma/schema.prisma` → untouched default (sqlite; every existing command keeps working byte-identically)
  - Create: `prisma/schema.postgresql.prisma` (full copy, exactly one line differs: `provider = "postgresql"`)
- Modify: `prisma.config.ts` (no change needed — default path already points at `prisma/schema.prisma`), `package.json` (generate/push scripts per provider, add `@prisma/adapter-pg` + `pg` in Task 2)
- Modify: `src/lib/db.ts` (URL-scheme adapter routing; keep `resolveSqliteFile()` behavior byte-identical)
- Create: `docker-compose.yml` (postgres:16-alpine, named volume, healthcheck, non-default port mapping to avoid local clashes)
- Modify: `.env.example` (commented Postgres URL template + which commands use which provider)
- Create: `docs/database.md` (which DB for what, commands, Neon wiring, troubleshooting the root-`dev.db` trap)
- Create tests: `tests/db-routing.test.ts`, `tests/db-pg-smoke.test.ts` (gated, skipped without a reachable PG)

---

### Task 1: Split schema by provider, both dialects validate

**Files:**
- Create: `prisma/models.prisma`
- Create: `prisma/datasource.sqlite.prisma`
- Create: `prisma/datasource.postgresql.prisma`
- Delete: `prisma/schema.prisma` (via `git rm`)
- Modify: `prisma.config.ts`, `package.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `prisma validate --schema <each file>` passes for both; `prisma generate --schema <each file>` emits a full client for both dialects. Design note: repeated `--schema` flags compose for `validate` but `generate` uses a single file, so the design keeps two full schema files (one-line difference) guarded by `tests/prisma-schema-parity.test.ts` instead of a shared-models split.

- [ ] **Step 1: Write the failing check**

```bash
npx prisma validate --schema=prisma/datasource.postgresql.prisma
```
Expected: FAIL (`datasource.postgresql.prisma` does not exist yet).

- [ ] **Step 2: Run it to verify it fails**

Run the command above. Expected: non-zero exit, file-not-found error.

- [ ] **Step 3: Add the postgresql twin and wire per-provider scripts**

Create `prisma/schema.postgresql.prisma` as a copy of `prisma/schema.prisma` with exactly one line changed (`provider = "postgresql"`); leave `prisma/schema.prisma` untouched so every existing command keeps working. Update `prisma.config.ts` only if the default path needs it (it already points at `prisma/schema.prisma` — no change expected), and add `package.json` scripts:
`db:generate:sqlite` (`--schema=prisma/schema.prisma`), `db:generate:pg` (`--schema=prisma/schema.postgresql.prisma`), `db:push:sqlite`, `db:push:pg`, keeping `db:generate`/`db:push` as the sqlite defaults. Add `tests/prisma-schema-parity.test.ts` pinning byte-identical models and the single-line provider difference.

- [ ] **Step 4: Run validation + generation for both dialects**

```bash
npx prisma validate --schema=prisma/datasource.sqlite.prisma
npx prisma validate --schema=prisma/datasource.postgresql.prisma
npm run db:generate:sqlite && npm run db:generate:pg
npx tsc --noEmit
```
Expected: both validate OK, both generate OK, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add prisma/ prisma.config.ts package.json
git commit -m "chore(db): split prisma schema per provider (sqlite + postgresql)"
git push origin main
```

---

### Task 2: URL-scheme adapter routing in `src/lib/db.ts`

**Files:**
- Modify: `src/lib/db.ts:1-34`
- Test: `tests/db-routing.test.ts`

**Interfaces:**
- Consumes: split schemas from Task 1 (no import changes needed).
- Produces: `resolveDbKind(url: string): "sqlite" | "postgresql"` (exported pure function); `db` singleton unchanged in shape for all 15 importers.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { resolveDbKind } from "@/lib/db";

describe("resolveDbKind", () => {
  it("routes file: URLs to sqlite", () => {
    expect(resolveDbKind("file:./prisma/dev.db")).toBe("sqlite");
    expect(resolveDbKind("file:./dev.db")).toBe("sqlite");
  });
  it("routes postgres schemes to postgresql", () => {
    expect(resolveDbKind("postgresql://u:p@localhost:5433/platformi")).toBe("postgresql");
    expect(resolveDbKind("postgres://u:p@localhost:5433/platformi")).toBe("postgresql");
  });
  it("rejects anything else instead of guessing", () => {
    expect(() => resolveDbKind("mysql://x")).toThrow(/unsupported/i);
  });
  it("keeps bare relative sqlite files under prisma/", async () => {
    const { resolveSqliteFile } = await import("@/lib/db");
    process.env.DATABASE_URL = "file:./dev.db";
    expect(resolveSqliteFile()).toMatch(/prisma\/dev\.db$/);
    delete process.env.DATABASE_URL;
  });
});
```
Expected: FAIL (`resolveDbKind` does not exist).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db-routing.test.ts`
Expected: FAIL with import error.

- [ ] **Step 3: Implement `resolveDbKind` in `src/lib/db.ts` and route the adapter**

Exported pure function on the URL scheme (`file:` → sqlite, `postgresql:`/`postgres:` → postgresql, else throw). `db` singleton: sqlite path keeps the existing `PrismaBetterSqlite3({ url: resolveSqliteFile() })` construction byte-identical; postgres path constructs `new Pool({ connectionString })` from `pg` + `new PrismaPg(pool)`. Keep the `globalForPrisma` singleton pattern.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/db-routing.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts tests/db-routing.test.ts package.json
git commit -m "feat(db): env-driven sqlite/postgres adapter routing"
git push origin main
```

---

### Task 3: Local Postgres via compose + documented wiring

**Files:**
- Create: `docker-compose.yml`
- Modify: `.env.example`
- Create: `docs/database.md`

**Interfaces:**
- Consumes: `db:push:pg` script from Task 1.
- Produces: `docker compose up -d db` yields a healthy Postgres; `.env.example` shows the exact URL template; `docs/database.md` documents which DB for what.

- [ ] **Step 1: Write the failing check**

```bash
docker compose config
```
Expected: FAIL (no compose file defines a `db` service yet).

- [ ] **Step 2: Run it to verify it fails**

Run the command above. Expected: non-zero exit.

- [ ] **Step 3: Add compose service, env template, and docs**

`db` service: `postgres:16-alpine`, named volume, healthcheck (`pg_isready`), host port `5433` (leaves 5432 free). `.env.example`: commented `DATABASE_URL="postgresql://platformi:platformi@localhost:5433/platformi"` plus a comment block stating sqlite = tests/dev default, postgres = prod-parity, and the root-`dev.db` misrouting trap. `docs/database.md`: commands table (`db:push:sqlite` vs `db:push:pg`, generate, seed), Neon wiring (paste URL, no other changes), troubleshooting.

- [ ] **Step 4: Verify config + full gate**

Run: `docker compose config && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: config renders, `tsc` clean, suite green (SQLite path untouched).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example docs/database.md
git commit -m "chore(db): local postgres compose service and database docs"
git push origin main
```

---

### Task 4: Live-Postgres verification (gated)

**Files:**
- Test: `tests/db-pg-smoke.test.ts`
- Modify (found live): `prisma/seed.ts`, `prisma/seed-intercity.ts` (shared `db` export instead of hardcoded sqlite clients), `src/lib/db.ts` (`closeDb()`), `package.json` (`build:pg`), `docs/database.md` (client-flavor rule)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: proof that push + seed + a transactional smoke check work against real Postgres, or an explicit skip with reason.

- [ ] **Step 1: Write the gated smoke test**

```ts
import { describe, it, expect } from "vitest";

const PG_URL = process.env.PG_TEST_URL ?? "";
const gated = PG_URL ? describe : describe.skip;

gated("postgres smoke (gated on PG_TEST_URL)", () => {
  it("pushes schema, seeds one region, reads it back in a transaction", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: PG_URL });
    try {
      const db = new PrismaClient({ adapter: new PrismaPg(pool) });
      const region = await db.region.create({
        data: {
          code: "SMOKE-01", name: "Smoke",
          centerLatitude: -6.2, centerLongitude: 106.8,
          boundaryCoordinatesJson: "[]",
        },
      });
      const read = await db.region.findUnique({ where: { id: region.id } });
      expect(read?.code).toBe("SMOKE-01");
      await db.region.delete({ where: { id: region.id } });
    } finally {
      await pool.end();
    }
  });
});
```
Expected: SKIP without `PG_TEST_URL` (documents the gate instead of failing CI).

- [ ] **Step 2: Run without the gate variable**

Run: `npx vitest run tests/db-pg-smoke.test.ts`
Expected: 1 skipped, 0 failed.

- [ ] **Step 3: Run the live sequence when a Postgres is reachable**

Run (requires `docker compose up -d db` with a running daemon, or a Neon URL):
```bash
PG_TEST_URL="postgresql://platformi:platformi@localhost:5433/platformi" npx vitest run tests/db-pg-smoke.test.ts
```
plus `DATABASE_URL=<same> npm run db:push:pg` and a seed dry-run that must exit 0 (a hang fails the step — catches an un-ended `pg` Pool). If no Postgres is reachable in this environment, record the exact blocker in the commit message body and ship the gated test as the deliverable.

- [ ] **Step 4: Commit**

```bash
git add tests/db-pg-smoke.test.ts
git commit -m "test(db): gated live-postgres smoke test"
git push origin main
```
(Self-review note: if the live run succeeded, fold its evidence into `docs/database.md` in this same commit.)
