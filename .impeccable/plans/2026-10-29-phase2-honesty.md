# Phase 2: Honest Commuter Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every time, ETA, and status the commuter sees is either real data or honestly labeled as a projection — no fiction, no silent staleness, no unanswerable trust questions.

**Architecture:** Remove the synthetic delay heuristic from the departure board (delays only from real timetable-divergence records, else schedule-labeled headway projections, locale-aware times); enforce the OCC-owned alert lifecycle with same-line overlapping-window dedup (latest wins); compute rule-based anomaly flags on crowdsource reports at feed-assembly time with quiet down-weighting and OCC-queue visibility.

**Tech Stack:** Existing `generateDepartureBoard` (HubDetailSheet), `reportScheduleDrift` patterns, alerts API + OCC board, crowdsource feed/checkin routes, vitest, 6-locale i18n.

**Spec:** `docs/superpowers/specs/2026-10-29-platformi-robustness-design.md` (Phase 2 + builder settlements: OCC-owned lifecycle, dedup = same line + overlapping window latest-wins, low-friction anonymous reporting kept).

**Deviations / deferred (explicit):**
- Guest badges + verified report weight need accounts, which don't exist yet — deferred to the identity work (Phase 3/4), noted in code as a single `TODO-identity` pointer, not scattered.
- No new tables: anomaly flags are computed at feed assembly (same data OCC already fetches), not stored.

## Global Constraints

- Zero placeholder stubs; zero emojis (Lucide only); strict TypeScript, no `any`.
- TDD with RED→GREEN per task; each task ships as its own commit + push to `origin main`.
- Verify before push: `npx tsc --noEmit`, `npm test`, `impeccable detect --json` on touched files, `git diff --check`.
- 6-locale i18n parity when keys change.
- No invented data; `dev.db` ignored and untouched; shared-DB test norms hold.

## Review Focus

- A "delayed" badge with no divergence record behind it (test pins: DELAYED requires a diverged run for that line/stop).
- Locale-hardcoded times (`id-ID` literals) anywhere in commuter paths (test renders non-English locale and asserts locale-shaped output).
- Resolved alerts leaking into live counts/banner (test pins ACTIVE-only after resolve).
- Dedup that merges distinct incidents (test pins: same line + overlapping window only; different causes stay separate — cause text compared, not just time).
- Flagged reports disappearing instead of down-weighted (test pins visibility with reduced weight, per the quiet down-weight decision).

## File Structure

- Modify: `src/components/inspector/HubDetailSheet.tsx` (board honesty: no synthetic delays, projection labels, locale-aware times)
- Modify: `src/app/api/alerts/route.ts` (resolve semantics: resolving sets `estimatedEndTime` when absent)
- Create: `src/lib/services/alertDedupe.ts` (same-line overlapping-window dedup, latest wins, cause-aware)
- Modify: `src/app/api/alerts/route.ts` or its service layer (apply dedup to ACTIVE listings)
- Create: `src/lib/services/crowdTrust.ts` (anomaly rules: consensus-contradiction ≥2 levels, burst threshold, note-spam)
- Modify: `src/app/api/crowdsource/feed/route.ts` (attach flags, down-weight flagged reports)
- Modify: `src/app/admin/fleet/page.tsx` (moderation queue shows flag badges + filter)
- Modify: `src/lib/i18n/*` + types (projection wording, flag labels)
- Create tests: `tests/departure-honesty.test.tsx`, `tests/alert-lifecycle.test.ts(x)`, `tests/crowd-anomaly.test.ts`

---

### Task 1: Honest departure board (no fabricated delays)

**Files:**
- Modify: `src/components/inspector/HubDetailSheet.tsx` (`generateDepartureBoard` + board rendering)
- Modify: `src/lib/i18n/*` + types (projection wording)
- Test: `tests/departure-honesty.test.tsx`

**Interfaces:**
- Consumes: `TimetableRun` divergence records (existing type: `tripType`, `divergedFromStopId`, `divergenceDescription`).
- Produces: `DepartureBoardItem[]` where `status === "DELAYED"` implies a matching diverged run; times formatted via `Intl` with the active locale.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { generateDepartureBoard } from "@/components/inspector/HubDetailSheet";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";

describe("departure honesty", () => {
  it("never fabricates DELAYED without a diverged run", () => {
    const stop = TRANSIT_STOPS.find((s) => s.code === "SBD") ?? TRANSIT_STOPS[0];
    const board = generateDepartureBoard(stop, TRANSIT_LINES, ...);
    expect(board.filter((b) => b.status === "DELAYED")).toEqual([]);
  });
  it("marks DELAYED only for lines with a diverged run at that stop", () => {
    // customRuns with tripType !== "REGULAR" for the line → exactly those items DELAYED
  });
  it("labels times as projections and formats per locale", () => {
    // render or inspect items: projection wording key present; non-ID locale does not emit id-ID shapes
  });
});
```

(Concrete call signature and locale plumbing follow the existing `generateDepartureBoard(stop, lines, t, customRuns?)` form; pin exact args while writing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/departure-honesty.test.tsx`
Expected: FAIL (synthetic `isDelayed` rule produces DELAYED with no runs).

- [ ] **Step 3: Remove the fabrication; wire real divergence; locale-aware times**

Delete the `timeIdx === 2 && lineIdx % 2 === 1` heuristic. `DELAYED` iff a `customRuns` entry with `tripType !== "REGULAR"` (or explicit delay marker) covers that line+stop; otherwise schedule-labeled headway projection. Replace hardcoded `toLocaleTimeString("id-ID", ...)` with the active locale (`Intl` via `language`), Asia/Jakarta zone kept. Board header/copy: projection wording (new keys ×6 + types). Keep existing adaptive counts, past-departure clipping, and operating-window clipping untouched.

- [ ] **Step 4: Verify incl. legacy board tests**

Run: `npx vitest run tests/departure-honesty.test.tsx tests/timetable-management.test.ts tests/timetable-matrix.test.ts tests/fleet-and-station-typologies.test.ts && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS (update any legacy expectations that pinned the fabricated delays — document each as harness-pinned fiction), `tsc` clean, suite green.

- [ ] **Step 5: Commit**

```bash
git add src/components/inspector/HubDetailSheet.tsx src/lib/i18n tests/departure-honesty.test.tsx <updated legacy tests>
git commit -m "fix(board): honest departures — no fabricated delays, locale-aware times"
git push origin main
```

---

### Task 2: Alert lifecycle + dedup (OCC-owned, latest wins)

**Files:**
- Modify: `src/app/api/alerts/route.ts` (PATCH resolve semantics)
- Create: `src/lib/services/alertDedupe.ts`
- Apply dedup to ACTIVE listings (route or service layer — executor picks the narrowest point that covers banner + drawer + planner)
- Test: `tests/alert-lifecycle.test.ts`

**Interfaces:**
- Consumes: builder settlement (OCC owns lifecycle; dedup key = same `lineId` + overlapping active window; latest `startTime` wins; different cause text = different incidents).
- Produces: `dedupeAlerts(alerts)` pure function; PATCH resolve sets `status: "RESOLVED"` and stamps `estimatedEndTime` when absent.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { dedupeAlerts } from "@/lib/services/alertDedupe";

const alert = (over: object) => ({ id: "x", lineId: "l1", title: "t", description: "same cause", severity: "WARNING", status: "ACTIVE", affectedStops: [], startTime: "", estimatedEndTime: null, ...over });

describe("alert lifecycle", () => {
  it("merges same-line overlapping alerts, latest wins", () => {
    const out = dedupeAlerts([alert({ id: "old", startTime: "2026-10-29T10:00:00Z" }), alert({ id: "new", startTime: "2026-10-29T11:00:00Z" })]);
    expect(out.map((a) => a.id)).toEqual(["new"]);
  });
  it("keeps distinct causes separate", () => {
    const out = dedupeAlerts([alert({ id: "a", description: "signal fault" }), alert({ id: "b", description: "flooding" })]);
    expect(out.map((a) => a.id).sort()).toEqual(["a", "b"]);
  });
  it("keeps non-overlapping windows separate", () => { /* ... */ });
  it("resolving stamps estimatedEndTime when absent (route-level: PATCH then GET shows RESOLVED, excluded from ACTIVE)", () => { /* ... */ });
});
```

(Exact overlap semantics: windows `[startTime, estimatedEndTime ?? +inf)` intersect. Cause comparison: normalized description equality after trim/lowercase.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/alert-lifecycle.test.ts`
Expected: FAIL (`alertDedupe` does not exist; route resolve path untested).

- [ ] **Step 3: Implement dedupe + resolve semantics**

Pure `dedupeAlerts` per the settlement. PATCH: accepting `status: "RESOLVED"` sets `estimatedEndTime` to now when absent (DB + in-memory runtime path both — check the route's dual paths). Apply dedupe where ACTIVE alerts are listed for banner/drawer/planner (single choke point; do not fork per consumer). Keep per-alert View on map / Plan alternate behavior untouched (existing tests guard it).

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/alert-lifecycle.test.ts tests/status-alert-actions.test.tsx tests/status-region.test.tsx && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/alertDedupe.ts src/app/api/alerts/route.ts <choke-point files> tests/alert-lifecycle.test.ts
git commit -m "feat(alerts): OCC-owned lifecycle with overlapping-window dedup"
git push origin main
```

---

### Task 3: Crowdsource anomaly flags + quiet down-weight + OCC visibility

**Files:**
- Create: `src/lib/services/crowdTrust.ts`
- Modify: `src/app/api/crowdsource/feed/route.ts` (attach flags, down-weight flagged weight)
- Modify: `src/app/admin/fleet/page.tsx` (moderation queue: flag badges + filter)
- Modify: `src/lib/i18n/*` + types (flag labels)
- Test: `tests/crowd-anomaly.test.ts`

**Interfaces:**
- Consumes: existing decay weighting (`calculateDecayWeight`), `SESSION_ID` semantics unchanged.
- Produces: `flagReport(report, context): AnomalyFlag[]` (`contradicts-consensus` when |level − weighted consensus| ≥ 2, `burst` when vehicle reports in trailing 10 min exceed threshold, `note-spam` on repeated identical notes); flagged reports stay visible at reduced weight; flags visible in OCC queue.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { flagReport } from "@/lib/services/crowdTrust";

describe("crowd anomaly flags", () => {
  it("flags a report contradicting consensus by 2+ levels", () => {
    expect(flagReport({ level: 4 }, { consensusLevel: 1, recentVehicleCount: 1, noteRepeats: 0 }).map((f) => f.kind)).toContain("contradicts-consensus");
  });
  it("flags bursts", () => {
    expect(flagReport({ level: 2 }, { consensusLevel: 2, recentVehicleCount: 6, noteRepeats: 0 }).map((f) => f.kind)).toContain("burst");
  });
  it("flags repeated identical notes", () => {
    expect(flagReport({ level: 2, note: "x" }, { consensusLevel: 2, recentVehicleCount: 1, noteRepeats: 3 }).map((f) => f.kind)).toContain("note-spam");
  });
  it("leaves ordinary reports unflagged", () => {
    expect(flagReport({ level: 2 }, { consensusLevel: 2, recentVehicleCount: 1, noteRepeats: 0 })).toEqual([]);
  });
  it("down-weights (never hides) flagged reports in the weighted density", () => {
    // feed-level: flagged contribution counts at reduced weight but remains listed
  });
});
```

(Exact thresholds live in the module as named constants; tests pin behavior, not magic numbers.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/crowd-anomaly.test.ts`
Expected: FAIL (`crowdTrust` does not exist).

- [ ] **Step 3: Implement flags, feed wiring, OCC visibility**

Pure `flagReport` + thresholds as named exports. Feed route: attach `flags` per item, multiply flagged weight by the down-weight factor in the density aggregation (items stay listed). OCC moderation queue (fleet page): flag badges + a flags-only filter; keep the existing remove flow untouched. New keys ×6 + types for flag labels only.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/crowd-anomaly.test.ts tests/crowd-submit.test.tsx tests/crowd-cards.test.tsx tests/crowd-polish.test.tsx && npx tsc --noEmit && npm test 2>&1 | tail -2`
Expected: PASS, clean, green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/crowdTrust.ts src/app/api/crowdsource/feed/route.ts src/app/admin/fleet/page.tsx src/lib/i18n tests/crowd-anomaly.test.ts
git commit -m "feat(crowd): anomaly flags with quiet down-weight and OCC visibility"
git push origin main
```

---

### Task 4: Commuter-surface honesty audit + labels

**Files:** Touched surfaces only (no new files except test)
- Test: `tests/commuter-honesty-audit.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a pinned inventory — every commuter-facing time/ETA/status string resolves to (a) live data, (b) a headway projection labeled as such, or (c) an explicit stale/empty state. No fourth category.

- [ ] **Step 1: Write the failing audit test**

Enumerate the claim sites (departure board, journey ETA/fare, banner counts, status drawer KPIs, feed timestamps, ticker): for each, assert the rendering path carries its honesty marker (projection label, updated stamp, stale badge, or empty state). Start with the sites Tasks 1–3 touched plus the journey planner ETA path; any site with none fails.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/commuter-honesty-audit.test.tsx`
Expected: FAIL (at least one unmarked claim).

- [ ] **Step 3: Mark every claim (labels/stamps, never new data)**

Add the missing honesty markers using existing vocabulary (projection wording, `scheduleUpdated` stamp, `stale` chip, empty states). No new data sources in this task.

- [ ] **Step 4: Verify + re-critique evidence**

Run: full suite green, then re-run `$impeccable critique` on homepage + status + crowdsource and record the score movement as the phase exit evidence.

- [ ] **Step 5: Commit**

```bash
git add <touched files> tests/commuter-honesty-audit.test.tsx
git commit -m "feat(ux): honesty markers across the commuter surface"
git push origin main
```
