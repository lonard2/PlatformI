# Intercity Data Ingest Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace existing intercity data with a newly ingested gateway-first dataset covering operators, routes, stops, prices, and classes.

**Architecture:** Extend Prisma with operator and boarding-point models, add a versioned seed ingester for intercity timetables, and expose read-only lookup APIs that gateway boards and ticket search consume; keep city data untouched.

**Tech Stack:** Prisma with SQLite, TypeScript seed scripts, Next.js App Router API routes, Vitest.

**Spec:** docs/superpowers/specs/2026-10-22-intercity-gateway-ticketing-design.md (§6.7 data and phasing, §6.5 per-mode matrix data needs)

## Global Constraints
- Zero placeholder stubs: every function, component, type, and endpoint fully implemented.
- Zero raw emojis: Lucide SVG icons only.
- Strict TypeScript typing: no `any` types; domain models typed via `src/types/transit.ts`.
- Six-locale i18n (en, id, ja, zh, ko, ar): identical key sets, Indonesian proper nouns untranslated.
- Responsive: mobile bottom drawer, tablet split-view, desktop multi-column.
- Verify before every push: `npx tsc --noEmit`, `npm test`, `git diff --check`; one commit per task with push to `origin main`.

## Review Focus
- An operator with no routes still appears in search filters; expect it to be hidden or marked empty, not crash search.
- A route missing a price still renders a board row; expect a price-unavailable state, not NaN.
- A re-run of the seed does not duplicate lines, stops, or runs; expect idempotent upserts.
- An id-locale operator name stays Indonesian in all six locales; expect no machine translation of proper nouns.
- A timetable with an invalid HH:mm time fails loudly at ingest; expect a validation error naming the trip code, not a silent skip.

---

### Task 1: Prisma models for operators and boarding points

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/transit.ts` (add `IntercityOperator`, `BoardingPoint` types)
- Test: `tests/intercity-data.test.ts`

**Interfaces:**
- Consumes: existing `Line`, `Stop`, `TimetableRun` relations.
- Produces: `IntercityOperator { id, name, mode, serviceTier }`; `BoardingPoint { id, operatorId, label, kind: "TERMINAL" | "AGEN" | "POOL" | "GATE" | "PIER" }`; `TimetableRun.operatorId?` and `TimetableRun.boardingPointIdsJson?`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
describe("intercity data models", () => {
  it("exposes operator and boarding-point types", async () => {
    const m = await import("@/types/transit");
    expect(typeof m).toBe("object");
  });
});
```

Refine after implementation to assert relation fields exist via a Prisma validate or type-level import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intercity-data.test.ts`
Expected: FAIL (types missing).

- [ ] **Step 3: Implement Prisma models plus TypeScript types with exact names above**

Run `npx prisma validate` and `npx prisma generate` as part of the implementation; keep city tables unchanged.

- [ ] **Step 4: Run test plus Prisma validate to verify**

Run: `npx vitest run tests/intercity-data.test.ts` (PASS); `npx prisma validate` (clean); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/types/transit.ts tests/intercity-data.test.ts
git commit -m "feat(data): intercity operator and boarding-point models"
```

### Task 2: Versioned intercity seed ingester replacing old data

**Files:**
- Create: `prisma/seed-intercity.ts`
- Modify: `prisma/seed.ts` (invoke or document ordering)
- Test: `tests/intercity-data.test.ts` (idempotency case)

**Interfaces:**
- Consumes: Prisma client, operator tables from Task 1, hand-authored timetable rows.
- Produces: `seedIntercity() -> Promise<{ operators: number; runs: number }>`; upsert by stable natural keys (operator code, trip code, stop code).

- [ ] **Step 1: Write the failing test**

```ts
it("seed is idempotent on second run", async () => {
  const first = await seedIntercity();
  const second = await seedIntercity();
  expect(second.runs).toBe(first.runs);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intercity-data.test.ts`
Expected: FAIL with "seedIntercity is not defined".

- [ ] **Step 3: Implement `prisma/seed-intercity.ts` with validation (HH:mm times, required origin, destination, operator) and upserts that replace intercity rows while leaving city rows intact**

First slice seeds one rail gateway plus a minimal operator set; later slices append gateways and modes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intercity-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-intercity.ts prisma/seed.ts tests/intercity-data.test.ts
git commit -m "feat(data): versioned intercity seed ingester"
```

### Task 3: Read-only intercity lookup APIs

**Files:**
- Create: `src/app/api/intercity/operators/route.ts`
- Create: `src/app/api/intercity/routes/route.ts`
- Test: `tests/intercity-data.test.ts` (API shape case) or `tests/network-api.test.ts` extension.

**Interfaces:**
- Consumes: Prisma `IntercityOperator`, `TimetableRun`, `BoardingPoint`.
- Produces: `GET /api/intercity/operators -> { operators: IntercityOperator[] }`; `GET /api/intercity/routes?mode=&company=&origin=&destination=&date= -> { runs: TimetableRun[] }`.

- [ ] **Step 1: Write the failing test**

```ts
it("filters routes by mode and company", async () => {
  const res = await GET(new Request("http://localhost/api/intercity/routes?mode=KAI_INTERCITY&company=KAI"));
  expect(res.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intercity-data.test.ts`
Expected: FAIL (route missing).

- [ ] **Step 3: Implement both routes with strict query validation and operator-name passthrough (no translation)**

Date filters a single day against `daysOfWeekJson`; unknown companies return an empty list, not an error.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/intercity-data.test.ts` (PASS); `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/intercity/operators/route.ts src/app/api/intercity/routes/route.ts tests/intercity-data.test.ts
git commit -m "feat(data): intercity lookup APIs"
```
