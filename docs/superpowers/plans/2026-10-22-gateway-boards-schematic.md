# Gateway Boards and Schematic Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render intercity trips as gateway boards with schematic outside-region progress while the live map stays interior-only.

**Architecture:** Keep the Leaflet map culled to a Jabodetabek bounding box; extend HubDetailSheet with arrival/departure boards per gateway hub; add a pure presentational schematic line for outside-region position fraction driven by existing timetable and simulation-clock interpolation.

**Tech Stack:** Next.js 16 App Router, React, Leaflet, Zustand (useTransitStore), Vitest, framer-motion.

**Spec:** docs/superpowers/specs/2026-10-22-intercity-gateway-ticketing-design.md (§6.1 hybrid placement, §6.6 status and tracking, §5 constraints)

## Global Constraints
- Zero placeholder stubs: every function, component, type, and endpoint fully implemented.
- Zero raw emojis: Lucide SVG icons only.
- Strict TypeScript typing: no `any` types; domain models typed via `src/types/transit.ts`.
- Six-locale i18n (en, id, ja, zh, ko, ar): identical key sets, Indonesian proper nouns untranslated.
- Responsive: mobile bottom drawer, tablet split-view, desktop multi-column.
- Verify before every push: `npx tsc --noEmit`, `npm test`, `git diff --check`; one commit per task with push to `origin main`.

## Review Focus
- A trip whose vehicle sits exactly on the region-box edge flickers between map dot and schematic-only; expect stable single rendering.
- A gateway hub with zero departures in the window shows an empty board; expect an explicit empty state, not a blank drawer.
- A user on ja locale sees board headers and schematic labels localized; expect no hardcoded English in new JSX.
- A keyboard-only user tabs through board rows and the Follow action; expect visible focus and operable controls.
- A trip with no stopTimesJson still renders a board row and schematic; expect graceful fallback, not a crash.

---

### Task 1: Region box and marker culling helper

**Files:**
- Modify: `src/lib/constants/modes.ts` (add `JABODEBEK_BOUNDS`)
- Create: `src/lib/transit/regionBox.ts`
- Test: `tests/region-box.test.ts`

**Interfaces:**
- Consumes: `Stop` / `Vehicle` latitude and longitude from `src/types/transit.ts`.
- Produces: `isInsideJabodetabek(lat: number, lng: number) -> boolean`; `JABODEBEK_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/region-box.test.ts
import { describe, it, expect } from "vitest";
import { isInsideJabodetabek } from "@/lib/transit/regionBox";
describe("region box", () => {
  it("keeps Gambir inside and Surabaya outside", () => {
    expect(isInsideJabodetabek(-6.176, 106.830)).toBe(true);
    expect(isInsideJabodetabek(-7.265, 112.745)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/region-box.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Implement `isInsideJabodetabek` in `src/lib/transit/regionBox.ts` and export `JABODEBEK_BOUNDS` from `src/lib/constants/modes.ts`**

Bounds cover Jakarta plus Bodetabek with a small margin; inclusive edges count as inside so edge vehicles do not flicker.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/region-box.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/region-box.test.ts src/lib/transit/regionBox.ts src/lib/constants/modes.ts
git commit -m "feat(gateway): Jabodetabek region box and inside check"
```

### Task 2: Cull live map markers to the region box

**Files:**
- Modify: `src/components/map/VehicleMarkerLayer.tsx`
- Test: extend `tests/region-box.test.ts` or `tests/m2-cartography-store.test.ts` with culling selector test.

**Interfaces:**
- Consumes: `isInsideJabodetabek` from Task 1; `simulatedVehicles` from `useTransitStore`.
- Produces: `selectVisibleVehicles(vehicles: Vehicle[]) -> Vehicle[]` (export for test).

- [ ] **Step 1: Write the failing test**

```ts
it("hides outside-region vehicles from the map layer", () => {
  const visible = selectVisibleVehicles([insideVehicle, outsideVehicle]);
  expect(visible.map((v) => v.id)).toEqual([insideVehicle.id]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/region-box.test.ts`
Expected: FAIL with "selectVisibleVehicles is not defined".

- [ ] **Step 3: Implement `selectVisibleVehicles` and apply it at the marker render site in `VehicleMarkerLayer.tsx`**

Filter by current latitude and longitude only; never mutate the underlying simulation list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/region-box.test.ts tests/m2-cartography-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/map/VehicleMarkerLayer.tsx tests/region-box.test.ts
git commit -m "feat(gateway): cull live markers to Jabodetabek box"
```

### Task 3: Gateway arrival and departure boards in HubDetailSheet

**Files:**
- Modify: `src/components/inspector/HubDetailSheet.tsx`
- Test: `tests/intercity-gateway.test.tsx`

**Interfaces:**
- Consumes: `TimetableRun`, `DepartureBoardItem` from `src/types/transit.ts`; `localizeRunField` from `src/lib/transit/runTexts.ts`.
- Produces: board rows with trip code, operator, times, service class, gate or bay, status, and a `Follow this trip` action carrying the run id.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders gateway board rows with follow action", () => {
  render(<HubDetailSheet stopId="stop-gambir" />);
  expect(screen.getByText(/KA-01/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /follow/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intercity-gateway.test.tsx`
Expected: FAIL (board section missing).

- [ ] **Step 3: Implement gateway board section in `HubDetailSheet.tsx` for the 11 hubs (Gambir, Pasar Senen, Halim, CGK, HLP, Pulo Gebang, Kampung Rambutan, Kalideres, Tanjung Priok, Muara Angke, Marina Ancol)**

Reuse existing departure-board generation; add empty-board state and follow action that selects the run id for the schematic in Task 4.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intercity-gateway.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/inspector/HubDetailSheet.tsx tests/intercity-gateway.test.tsx
git commit -m "feat(gateway): arrival and departure boards per hub"
```

### Task 4: Schematic progress line for outside-region tracking

**Files:**
- Create: `src/components/inspector/IntercitySchematic.tsx`
- Modify: `src/components/inspector/HubDetailSheet.tsx` (embed schematic in trip detail)
- Test: extend `tests/intercity-gateway.test.tsx`

**Interfaces:**
- Consumes: run id plus `stopTimesJson` or origin and destination fallback.
- Produces: `<IntercitySchematic runId={string} fraction={number} />` rendering stop ticks with names and a position marker; `computeSchematicFraction(run, nowMs: number) -> number` clamped to 0..1.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders schematic stops with live position", () => {
  render(<IntercitySchematic runId="run-g1012" fraction={0.5} />);
  expect(screen.getByText(/Halim/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intercity-gateway.test.tsx`
Expected: FAIL with "IntercitySchematic not defined".

- [ ] **Step 3: Implement `IntercitySchematic.tsx` as pure presentational SVG or divs with Lucide icons, no Leaflet dependency**

Fraction comes from timetable and simulation-clock interpolation; component itself performs no fetching.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/intercity-gateway.test.tsx` (PASS), then `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/inspector/IntercitySchematic.tsx src/components/inspector/HubDetailSheet.tsx tests/intercity-gateway.test.tsx
git commit -m "feat(gateway): schematic outside-region progress line"
```
