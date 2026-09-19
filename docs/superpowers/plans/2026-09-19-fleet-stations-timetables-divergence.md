# Fleet Persistence, Station Typologies, Rich Timetables & Vehicle Divergence Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SQLite database persistence for custom fleet vehicles, rich station typologies (TOD, Terminal, Rail, Airport, Port, Shelter) and scales (Small/Medium/Big), customizable timetable departure metadata (airlines, rail origins, notes, service classes), and simulated path/time divergence (traffic delays, holding, route detours).

**Architecture:** 
1. Backend REST endpoints (`/api/fleet/vehicles`, `/api/network/stops`) interfacing with Prisma SQLite and runtime fallback cache.
2. Domain types (`src/types/transit.ts`) extended with non-breaking optional fields (`stationType`, `scale`, `delayMinutes`, `detourCoordinates`, `TimetableRun`).
3. Admin control panels (`/admin/fleet`, `/admin/network`) enabling station scale/type selection and vehicle persistence.
4. Cartography & Simulation (`useTransitSimulation.ts`, `HubMarkerLayer.tsx`, `HubDetailSheet.tsx`) rendering adaptive markers, rich FIDS/peron departure boards, and dynamic delay/detour vector interpolation.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.5, Prisma ORM with SQLite, Tailwind CSS, Lucide React icons, Vitest.

---

## Global Constraints

- Zero placeholder stubs: all functions, endpoints, and components must be fully implemented.
- Zero raw emojis: use strictly Lucide SVG icons (`lucide-react`).
- Strict TypeScript: no `any` types.
- Zero test regressions: all 288 existing Vitest tests must remain 100% passing.
- Atomic commits with clean messages pushed to `origin/main`.

---

## File Structure

- **Types & Core Interfaces**:
  - Modify: `src/types/transit.ts` (Add `StationType`, `StationScale`, `TimetableRun`, extend `Stop`, `Vehicle`, `DepartureBoardItem`)
- **Backend API Endpoints**:
  - Create: `src/app/api/fleet/vehicles/route.ts` (`GET`, `POST`, `PUT`, `DELETE` for fleet persistence)
  - Modify: `src/app/api/network/stops/route.ts` (Handle `stationType` and `scale` serialization)
- **Admin Control UI**:
  - Modify: `src/app/admin/fleet/page.tsx` (Wire `handleAddVehicle`, `handleStatusChange`, `handleDelete` to `/api/fleet/vehicles`)
  - Modify: `src/app/admin/network/page.tsx` (Add Station Type & Scale selector to Stop Modal)
- **Cartography & UI Presentation**:
  - Modify: `src/components/map/HubMarkerLayer.tsx` (Adapt marker visual scale & type badges)
  - Modify: `src/components/inspector/HubDetailSheet.tsx` (Render rich timetable metadata: airlines, origins, notes, service classes, gates/bays)
- **Simulation Vector Engine**:
  - Modify: `src/lib/hooks/useTransitSimulation.ts` (Support vehicle delays, variable speeds, and detour coordinates)
- **Automated Tests**:
  - Create: `tests/fleet-and-station-typologies.test.ts` (Unit test persistence, timetable metadata, station scale filters, and divergence mechanics)

---

### Task 1: Domain Model Extensions (Station Types, Scale, Timetable Runs, Vehicle Divergence)

**Files:**
- Modify: `src/types/transit.ts`
- Test: `tests/fleet-and-station-typologies.test.ts`

**Interfaces:**
- Consumes: Existing `Stop`, `Vehicle`, `DepartureBoardItem`
- Produces:
  ```typescript
  export type StationType =
    | "TOD"
    | "RAIL_STATION"
    | "BUS_TERMINAL"
    | "AIRPORT_TERMINAL"
    | "HARBOR_PORT"
    | "BUS_SHELTER";

  export type StationScale = "SMALL" | "MEDIUM" | "BIG";

  export interface TimetableRun {
    id: string;
    lineId: string;
    tripCode: string;
    origin: string;
    destination: string;
    departureTime: string; // HH:mm
    arrivalTime: string;   // HH:mm
    operatorName: string;
    serviceClass?: string;
    gateOrBay?: string;
    notes?: string;
    baggageBelt?: string;
    daysOfWeek?: number[]; // [0,1,2,3,4,5,6]
  }
  ```

- [ ] **Step 1: Write the failing test for domain type interfaces and helper validators**

```typescript
// tests/fleet-and-station-typologies.test.ts
import { describe, it, expect } from "vitest";
import { StationType, StationScale, Stop, DepartureBoardItem, TimetableRun } from "../src/types/transit";

describe("Domain Model: Station Typologies & Timetable Runs", () => {
  it("validates station typology and scale assignments", () => {
    const hubStop: Partial<Stop> = {
      id: "stop-dka-tod",
      name: "Dukuh Atas TOD",
      code: "DKA",
      stationType: "TOD",
      scale: "BIG",
    };
    expect(hubStop.stationType).toBe("TOD");
    expect(hubStop.scale).toBe("BIG");
  });

  it("validates rich timetable departure items with airline and rail notes", () => {
    const flightDeparture: Partial<DepartureBoardItem> = {
      tripId: "trip-ga404",
      lineCode: "GA-404",
      origin: "Soekarno-Hatta (CGK)",
      destination: "Ngurah Rai (DPS)",
      operatorName: "Garuda Indonesia",
      serviceClass: "Business & Economy",
      gateOrBay: "Gate 14",
      baggageBelt: "Belt 5",
      notes: "Boarding gate closes 15m prior to departure",
    };
    expect(flightDeparture.operatorName).toBe("Garuda Indonesia");
    expect(flightDeparture.gateOrBay).toBe("Gate 14");
    expect(flightDeparture.notes).toContain("closes 15m prior");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`
Expected: Compile failure if types or properties are missing.

- [ ] **Step 3: Update `src/types/transit.ts`**

Add `StationType`, `StationScale`, `TimetableRun`, and extend `Stop`, `Vehicle`, `DepartureBoardItem` with non-breaking optional fields (`stationType`, `scale`, `delayMinutes`, `speedModifier`, `detourCoordinates`, `origin`, `notes`, `gateOrBay`, `serviceClass`, `baggageBelt`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/types/transit.ts tests/fleet-and-station-typologies.test.ts
git commit -m "feat(types): add station typologies, scale, timetable runs, and vehicle divergence fields"
```

---

### Task 2: Fleet Management SQLite Persistence API

**Files:**
- Create: `src/app/api/fleet/vehicles/route.ts`
- Modify: `src/app/admin/fleet/page.tsx`
- Test: `tests/fleet-and-station-typologies.test.ts`

**Interfaces:**
- Consumes: `db.vehicle` (Prisma SQLite), `Vehicle` type
- Produces:
  - `GET /api/fleet/vehicles`: returns list of vehicles (from DB with fallback to seed data)
  - `POST /api/fleet/vehicles`: creates new vehicle in DB and returns created unit
  - `PUT /api/fleet/vehicles`: updates status, speed, crowd level, coachbuilder, chassis
  - `DELETE /api/fleet/vehicles?id=XYZ`: removes vehicle from DB

- [ ] **Step 1: Write tests for Fleet API route handlers**

In `tests/fleet-and-station-typologies.test.ts`, add test cases verifying `GET`, `POST`, `PUT`, `DELETE` validation logic.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`

- [ ] **Step 3: Implement `src/app/api/fleet/vehicles/route.ts`**

Implement complete `GET`, `POST`, `PUT`, `DELETE` handlers using Prisma `db.vehicle` with runtime in-memory caching for zero-downtime resilience.

- [ ] **Step 4: Update `src/app/admin/fleet/page.tsx`**

Connect `handleAddVehicle`, operational status toggles, speed sliders, and vehicle deletions to `/api/fleet/vehicles` so state is saved persistently to SQLite.

- [ ] **Step 5: Run tests and verify zero regressions**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit changes**

```bash
git add src/app/api/fleet/vehicles/route.ts src/app/admin/fleet/page.tsx tests/fleet-and-station-typologies.test.ts
git commit -m "feat(fleet): implement persistent SQLite API for custom vehicle fleet creation and editing"
```

---

### Task 3: Station Typologies & Scale in Admin Studio & Cartography

**Files:**
- Modify: `src/app/api/network/stops/route.ts`
- Modify: `src/app/admin/network/page.tsx`
- Modify: `src/components/map/HubMarkerLayer.tsx`
- Test: `tests/fleet-and-station-typologies.test.ts`

**Interfaces:**
- Consumes: `StationType`, `StationScale`, `Stop`
- Produces:
  - `/api/network/stops`: serializes `stationType` and `scale` in SQLite `platformType` or `facilitiesJson` cleanly.
  - `/admin/network`: UI selector for Station Type (`TOD`, `RAIL_STATION`, `BUS_TERMINAL`, `AIRPORT_TERMINAL`, `HARBOR_PORT`, `BUS_SHELTER`) and Scale (`SMALL`, `MEDIUM`, `BIG`).
  - `HubMarkerLayer.tsx`: dynamic marker styling: Small (compact circle), Medium (standard badge), Big (prominent glowing hub with typology icon).

- [ ] **Step 1: Write tests for Stop serialization with stationType and scale**

In `tests/fleet-and-station-typologies.test.ts`, verify that stops retain their `stationType` and `scale` through creation, retrieval, and updates.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`

- [ ] **Step 3: Update `src/app/api/network/stops/route.ts`**

In `GET`, `POST`, `PUT`, parse and persist `stationType` and `scale`.

- [ ] **Step 4: Update `src/app/admin/network/page.tsx`**

Add Station Type dropdown and Station Scale selector (Small, Medium, Big) in the Stop Modal.

- [ ] **Step 5: Update `src/components/map/HubMarkerLayer.tsx`**

Style markers by scale and typology (distinct Lucide icons: `Building2` for TOD, `Train` for Rail, `Bus` for Terminal, `Plane` for Airport, `Ship` for Port).

- [ ] **Step 6: Run tests and verify**

Run: `npm test`
Expected: All 288+ tests pass.

- [ ] **Step 7: Commit changes**

```bash
git add src/app/api/network/stops/route.ts src/app/admin/network/page.tsx src/components/map/HubMarkerLayer.tsx tests/fleet-and-station-typologies.test.ts
git commit -m "feat(stations): add station typologies, scale levels, and adaptive map marker visualization"
```

---

### Task 4: Customizable Timetable Metadata in Hub Detail Sheet

**Files:**
- Modify: `src/components/inspector/HubDetailSheet.tsx`
- Test: `tests/fleet-and-station-typologies.test.ts`

**Interfaces:**
- Consumes: `DepartureBoardItem` with `origin`, `destination`, `operatorName`, `serviceClass`, `gateOrBay`, `notes`, `baggageBelt`
- Produces: Enhanced Departure Board UI displaying:
  - Airlines (e.g. Garuda Indonesia, Citilink) with flight numbers and Gate/Baggage Belt indicators.
  - Rail services with origin, track/peron numbers, and express bypass notes.
  - Executive shuttles with pool-to-pool routes and luggage/amenity notes.

- [ ] **Step 1: Write test for rich timetable rendering**

In `tests/fleet-and-station-typologies.test.ts`, test helper functions for formatting departure cards with custom airline, origin, and service class metadata.

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`

- [ ] **Step 3: Update `generateDepartureBoard` in `HubDetailSheet.tsx`**

Enhance `generateDepartureBoard` to populate mode-appropriate metadata (Airlines for Aviation, PO operators for AKAP, Railink for Bandara, DayTrans/CitiTrans for Shuttles) with custom origin, gate/bay, and operational notes.

- [ ] **Step 4: Update the Departure Card component in `HubDetailSheet.tsx`**

Render chips for `gateOrBay`, `serviceClass`, and expandable operational `notes`.

- [ ] **Step 5: Run tests and verify**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit changes**

```bash
git add src/components/inspector/HubDetailSheet.tsx tests/fleet-and-station-typologies.test.ts
git commit -m "feat(timetables): support customizable timetable departure items with airlines, origins, and operational notes"
```

---

### Task 5: Vehicle Temporal & Spatial Divergence Engine

**Files:**
- Modify: `src/lib/hooks/useTransitSimulation.ts`
- Test: `tests/fleet-and-station-typologies.test.ts`

**Interfaces:**
- Consumes: `Vehicle.delayMinutes`, `Vehicle.speedModifier`, `Vehicle.detourCoordinates`
- Produces:
  - Vector simulation engine that applies stochastic traffic variations or admin delay overrides.
  - Vehicles traversing `detourCoordinates` when an active detour path is configured.
  - Realistic next-stop ETA calculation incorporating active delays.

- [ ] **Step 1: Write unit tests for vehicle divergence math**

In `tests/fleet-and-station-typologies.test.ts`, test:
  1. Vehicle with `delayMinutes: 5` or `speedModifier: 0.5` reduces movement step and pushes back next-stop ETA.
  2. Vehicle with `detourCoordinates` interpolates along detour points instead of default line coordinates.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fleet-and-station-typologies.test.ts`

- [ ] **Step 3: Update `useTransitSimulation.ts`**

Incorporate `vehicle.delayMinutes`, `vehicle.speedModifier`, and optional `vehicle.detourCoordinates` into distance progression and ETA calculations.

- [ ] **Step 4: Run full test suite and build verification**

Run: `npm test` and `npm run build`
Expected: All tests pass 100%, Next.js build passes with 0 type errors.

- [ ] **Step 5: Commit and push**

```bash
git add src/lib/hooks/useTransitSimulation.ts tests/fleet-and-station-typologies.test.ts
git commit -m "feat(simulation): implement temporal delays and spatial detour path divergence"
git push origin main
```

---

## Verification Checklist

- [ ] All 288+ Vitest tests pass cleanly.
- [ ] `npm run build` succeeds without TypeScript warnings or compilation errors.
- [ ] Admin can add/edit vehicles and they persist in SQLite across page reloads.
- [ ] Admin can assign Station Typologies (TOD, Terminal, Rail, Airport, Port, Shelter) and Scales (Small, Medium, Big).
- [ ] Map displays appropriate visual scale for small shelters vs grand TOD terminals.
- [ ] Station departure board displays rich customizable metadata (Airlines, origins, gates/bays, notes).
- [ ] Running vehicles can experience traffic delays, holding, and route detours rather than rigid looping.
