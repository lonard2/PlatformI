# Phase 1: Data Freshness Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No bad GTFS feed can reach the UI, and every dataset shows its age — scheduled refresh with fail-closed gates, persisted run reports, and visible freshness.

**Architecture:** `scripts/derive-gtfs-schedule.py` gains provenance emission (`generatedAt`, feed fingerprint); a `scripts/refresh-schedule.sh` wrapper derives to temp, validates, compares coverage, and only then promotes the artifact (bad runs quarantine with a report); a `ScheduleRefreshRun` Postgres table persists every run; the UI renders the artifact's age with a stale badge past the threshold.

**Tech Stack:** Python 3 stdlib only (derive script), bash wrapper, Prisma 7 (new `ScheduleRefreshRun` model, no relations), existing `gtfsSchedule.ts` validators, vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-platformi-robustness-design.md` (Phase 1 + TTL settlements; one deviation noted below).

**Deviation from spec (author call, partner-confirmed 2026-10-29):** the design's 7-day stale default assumed dynamic sources. Static GTFS uses a two-tier model instead: a lightweight **7-day check** (fingerprint the feed; unchanged → log a "no change" run and finish; changed → full derive + gates), and a **90-day hard line** — no successful refresh for 90 days triggers the stale badge, a failing scheduled check, and an OCC-visible alert. Never re-derive identical data just to reset the clock. Run reports persist to Postgres (confirmed beneficial for later phases); file log is fallback only.

## Global Constraints

- Zero placeholder stubs; zero emojis (Lucide only); strict TypeScript, no `any`.
- TDD with RED→GREEN per task; each task ships as its own commit + push to `origin main`.
- Verify before push: `npx tsc --noEmit`, `npm test`, `impeccable detect --json` on touched files, `git diff --check`.
- 6-locale i18n parity when keys change.
- No invented data; never commit the raw GTFS zip (temp dir only, existing rule).
- `dev.db` ignored and untouched by commits; shared-DB test norms hold.

## Review Focus

- A derive run against a changed upstream feed that silently drops a route (coverage gate must catch <41 lines and abort the promote).
- `generatedAt` formats that don't parse across locales (pin ISO-8601 UTC with `Z`, never locale strings).
- Quarantine that still leaks: a failed run must not touch the committed artifact, the dev DB, or the UI stamps (test asserts artifact bytes + stamp unchanged). A no-change check run must also leave the artifact byte-identical.
- Drift-report writes that fail when Postgres is unreachable (runner must degrade to file log, exit code still reflects validation).
- Stale-badge thresholds evaluated in the wrong timezone (compute age in UTC ms, never calendar days).

## File Structure

- Modify: `scripts/derive-gtfs-schedule.py` (provenance emission)
- Create: `scripts/refresh-schedule.sh` (derive → temp → validate → compare → promote-or-quarantine)
- Modify: `src/lib/services/gtfsSchedule.ts` (require provenance, optional-artifact params for tests)
- Modify: `prisma/schema.prisma` + `prisma/schema.postgresql.prisma` (add `ScheduleRefreshRun`, no relations)
- Modify: `package.json` (`data:refresh-schedule` script)
- Modify: `src/lib/i18n/*` + status surface (freshness stamp + stale badge; key additions ×6 + types)
- Create: `docs/database.md` vintage-table section (append), `var/` quarantine dir (gitignored)
- Create tests: `tests/gtfs-provenance.test.ts`, `tests/gtfs-refresh-gates.test.ts`, `tests/schedule-freshness-ui.test.tsx`

---

### Task 1: Provenance in the artifact, required by validation

**Files:**
- Modify: `scripts/derive-gtfs-schedule.py` (emit `generatedAt` ISO-8601 UTC + `feedFingerprint`)
- Modify: `src/lib/services/gtfsSchedule.ts` (`validateDerivedArtifact(artifact = ARTIFACT)`, error when provenance missing/malformed)
- Test: `tests/gtfs-provenance.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: artifact shape `{generatedAt, feedFingerprint, ...}`; `validateDerivedArtifact` accepting an override artifact for tests.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { validateDerivedArtifact } from "@/lib/services/gtfsSchedule";

const BASE = { generatedNote: "x", feedUrl: "https://example.invalid/f.zip", allowedServices: ["SH"], lines: {} };

describe("artifact provenance", () => {
  it("rejects an artifact with no generatedAt", () => {
    expect(validateDerivedArtifact({ ...BASE, lines: {} } as never)).toContainEqual(
      expect.stringMatching(/generatedAt/i)
    );
  });
  it("rejects a malformed generatedAt", () => {
    expect(validateDerivedArtifact({ ...BASE, generatedAt: "22 Agu 2026", lines: {} } as never)).toContainEqual(
      expect.stringMatching(/generatedAt/i)
    );
  });
  it("accepts ISO-8601 UTC provenance", () => {
    const errors = validateDerivedArtifact({ ...BASE, generatedAt: "2026-10-29T00:00:00Z", feedFingerprint: "sha256:abc", lines: {} } as never);
    expect(errors.filter((e) => /generatedAt|fingerprint/i.test(e))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gtfs-provenance.test.ts`
Expected: FAIL (no `generatedAt` checks exist; empty-lines error only).

- [ ] **Step 3: Implement provenance emission + required validation**

Script: add `generated_at = datetime.now(timezone.utc).strftime(...)` and a feed fingerprint (SHA-256 of the downloaded zip bytes, first 16 hex chars) into the artifact top level. TS: `validateDerivedArtifact(artifact: GtfsDerivedArtifact = ARTIFACT)`; push errors for missing/malformed `generatedAt` (must match `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/`) and missing `feedFingerprint`. Extend the `GtfsDerivedArtifact` interface with both fields.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/gtfs-provenance.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/derive-gtfs-schedule.py src/lib/services/gtfsSchedule.ts tests/gtfs-provenance.test.ts
git commit -m "feat(data): require provenance in GTFS-derived artifact"
git push origin main
```

---

### Task 2: Fail-closed refresh runner + persisted run reports

**Files:**
- Create: `scripts/refresh-schedule.sh`
- Modify: `prisma/schema.prisma`, `prisma/schema.postgresql.prisma` (add `ScheduleRefreshRun`, no relations)
- Modify: `package.json` (`data:refresh-schedule`)
- Test: `tests/gtfs-refresh-gates.test.ts`

**Interfaces:**
- Consumes: Task 1 validators.
- Produces: runner exit codes (`0` promoted, `2` quarantined with report); `ScheduleRefreshRun` rows per run.

```prisma
model ScheduleRefreshRun {
  id             String   @id @default(cuid())
  startedAt      DateTime @default(now())
  feedUrl        String
  feedFingerprint String  @default("")
  lineCount      Int      @default(0)
  stopRowCount   Int      @default(0)
  status         String   // "ok" | "quarantined" | "failed"
  errorsJson     String   @default("[]")
  driftJson      String   @default("[]")
  createdAt      DateTime @default(now())
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { validateDerivedArtifact } from "@/lib/services/gtfsSchedule";

describe("refresh gates", () => {
  it("fails closed below the 41-line coverage floor", () => {
    expect(41).toBeGreaterThanOrEqual(41); // placeholder replaced below
  });
});
```

Replace the placeholder with the real gate before running: import the gate helper from the new `src/lib/services/scheduleRefresh.ts` (`assessRefresh(candidate, current)` returning `"promote" | "quarantine"` with reasons), and assert a 40-line candidate quarantines while the current 41-line artifact promotes. The helper is the testable core; the bash wrapper calls `tsx` one-liners over the same validators.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gtfs-refresh-gates.test.ts`
Expected: FAIL (`scheduleRefresh.ts` does not exist).

- [ ] **Step 3: Implement the gate helper, the model, and the wrapper**

`src/lib/services/scheduleRefresh.ts`: `assessRefresh(candidate, current)` — quarantine on any `validateDerivedArtifact` error, `<41` lines, or any line losing all directions vs current; return reasons list. Add the `ScheduleRefreshRun` model to **both** schema files (identical block; parity test covers it), `db:push` sqlite (and pg when reachable). `scripts/refresh-schedule.sh`: two-tier run. (1) Check: fetch feed headers (ETag/Last-Modified; full download only if moved), fingerprint; unchanged vs last `ok` run → record a `checked-no-change` run and exit `0` without touching the artifact. (2) Changed: derive to temp (`--out` flag — add if missing), run validators via `npx tsx`, coverage-compare via `assessRefresh`, promote (`cp` over the committed artifact) or quarantine to `var/quarantine/<ts>/` with `report.json`, then record the `ScheduleRefreshRun` row (file-log fallback to `var/runs.log` when Postgres is unreachable; exit code still reflects validation: `0` promoted/unchanged, `2` quarantined).

- [ ] **Step 4: Run tests, typecheck, and gates**

Run: `npx vitest run tests/gtfs-refresh-gates.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, suite green.

- [ ] **Step 5: Commit**

```bash
git add scripts/refresh-schedule.sh src/lib/services/scheduleRefresh.ts prisma/schema.prisma prisma/schema.postgresql.prisma package.json tests/gtfs-refresh-gates.test.ts
git commit -m "feat(data): fail-closed GTFS refresh runner with persisted run reports"
git push origin main
```

---

### Task 3: First gated refresh run against the live feed

**Files:**
- Modify: `src/lib/data/gtfs-derived.json` (only if the run promotes)
- Modify: `docs/gtfs-schedule-refresh.md` (vintage table entry), `docs/database.md` (vintage section)

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: a promoted fresh artifact **or** a quarantine report + unchanged artifact; either way a `ScheduleRefreshRun` row.

- [ ] **Step 1: Run the scheduled check for real (7-day cadence starts here)**

Run: `npm run data:refresh-schedule`
Expected: exit `0` (unchanged or promoted) or `2` (quarantined with `report.json`).

- [ ] **Step 2: Verify promotion safety (or confirm quarantine integrity)**

If promoted: `git diff --stat src/lib/data/gtfs-derived.json`, `npm test`, and confirm stop-join counts vs the 2254-stop dataset hold. If quarantined: confirm the committed artifact is byte-identical (`git diff --exit-code`) and the report names the blocking reason.

- [ ] **Step 3: Record the vintage + commit the outcome**

Update the vintage table in `docs/gtfs-schedule-refresh.md` either way.

```bash
git add src/lib/data/gtfs-derived.json docs/gtfs-schedule-refresh.md docs/database.md
git commit -m "data: scheduled GTFS refresh <YYYY-MM-DD> (promoted|quarantined: <reason>)"
git push origin main
```

---

### Task 4: Freshness stamps + stale badges in the UI

**Files:**
- Modify: status surface (stamp + badge; exact component follows the existing attribution pattern in `HubDetailSheet.tsx:1121`)
- Modify: `src/lib/i18n/*` (keys ×6 + types)
- Test: `tests/schedule-freshness-ui.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`generatedAt` in artifact).
- Produces: visible "Updated <date>" + stale badge past 90 days; no silent-stale states.

- [ ] **Step 1: Write the failing test**

Render the surface hosting the stamp with the real artifact (whose `generatedAt` predates the threshold in test time — or inject via the same override seam as Task 1): assert the rendered "Updated" text contains the artifact date, and that a stale badge appears when `generatedAt` is older than 90 days. (Concrete selectors follow the attribution markup found in recon.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule-freshness-ui.test.tsx`
Expected: FAIL (no stamp exists).

- [ ] **Step 3: Implement stamp + badge + keys**

Read `generatedAt` from the artifact, format via `Intl` (locale-aware, UTC-based age math in ms — never calendar days), badge when age > 90 days with escalation copy (stale + check-failing state already covered by the runner). Audit remaining dataset-max-as-today labels (HISTORY-style) and reword to latest-data language. New keys (×6 + types) following the existing attribution copy voice.

- [ ] **Step 4: Run tests + typecheck + suite**

Run: `npx vitest run tests/schedule-freshness-ui.test.tsx && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/components <touched files> src/lib/i18n tests/schedule-freshness-ui.test.tsx
git commit -m "feat(data): visible schedule freshness with stale badge"
git push origin main
```

---

### Task 5: Seed hygiene + vintage documentation

**Files:**
- Modify: `package.json` (`db:seed:scratch`), `docs/gtfs-schedule-refresh.md`, `docs/database.md`
- Test: extend `tests/m1-dataset-audit.test.ts`-adjacent coverage (assert seed is deterministic: two scratch reseeds → identical stop/line counts)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: reproducible scratch reseeds; documented feed vintages.

- [ ] **Step 1: Write the failing check**

```bash
DATABASE_URL="file:./scratch-verify.db" npm run db:seed:scratch
```
Expected: FAIL (script does not exist).

- [ ] **Step 2: Run it to verify it fails**

Run the command above. Expected: non-zero exit.

- [ ] **Step 3: Implement scratch reseed + determinism test**

`db:seed:scratch`: push schema + seed against a temp-file DB, print line/stop/vehicle counts, delete the file. Determinism test seeds twice to two temp files and asserts identical counts (runs sqlite-only, cleans up after itself per shared-DB norms).

- [ ] **Step 4: Verify + document vintages**

Run the scratch flow twice, record feed vintages (GTFS `generatedAt`, OSM pull date, hand-authored tables) in `docs/gtfs-schedule-refresh.md`.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/<determinism-test> docs/gtfs-schedule-refresh.md docs/database.md
git commit -m "chore(data): reproducible scratch reseeds with vintage docs"
git push origin main
```
