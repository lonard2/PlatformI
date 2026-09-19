# Task 4 Report: Customizable Timetable Metadata in Hub Detail Sheet

## Overview
Implemented Task 4 from the implementation plan `docs/superpowers/plans/2026-09-19-fleet-stations-timetables-divergence.md`.
Populated authentic, rich timetable departure metadata in `HubDetailSheet.tsx` across Aviation, Rail, Shuttle, BRT, and Maritime modes, enhanced the Departure Card visual hierarchy with origin-destination routing, badge chips (`gateOrBay`, `serviceClass`, `baggageBelt`), and sleek glassmorphic operational notes callouts, and added comprehensive unit testing.

## Key Changes
1. **`src/components/inspector/HubDetailSheet.tsx`**:
   - Exported `generateDepartureBoard(stop, lines, t)` for direct testability.
   - Enhanced `generateDepartureBoard`:
     - **Origin & Destination Derivation**: Parsed terminus pairs from line names with authentic modal fallbacks (e.g. Aviation: `"Soekarno-Hatta (CGK)"` / `"Halim Perdanakusuma (HLP)"`; Whoosh: `"Stasiun Halim HSR"`; KAI Intercity: `"Stasiun Gambir (GMR)"` / `"Pasar Senen (PSE)"`; Shuttles: `"Pool fX Sudirman"`; TransJakarta: line origin terminus).
     - **Gate & Bay Allocations**: Mode-specific boarding designations (`Gate ${offsetIdx + 12}` for flights, `Bay ${offsetIdx + 3}` for AKAP/Shuttle, `Peron ${platformNumber} (Jalur ${(offsetIdx % 6) + 1})` for rail, `Bay ${offsetIdx + 1}` for BRT).
     - **Service Classes**: Authentic service tier designations (`"Business & Economy Class"`, `"Premium Economy & First Class"`, `"Eksekutif New Gen & Luxury Suite"`, `"Airport Executive Express"`, `"VIP 8-Seater Captain Recliner"`, `"BRT Standard Rapid"`, `"JakLingko AC & Non-AC Angkot"`, `"Kelas 1A & Ekonomi"`).
     - **Baggage Belt**: Set `Belt ${(offsetIdx % 8) + 1}` for Aviation.
     - **Operational Notes**: Real-world operational instructions (e.g. flight boarding gate deadlines, Whoosh early arrival, rail bypass/Wi-Fi, shuttle MBZ routing and luggage allowance, TransJakarta 24h AMARI, JakLingko Rp 0 tap instructions).
     - **Transit Routing Summaries**: High-level key stop summaries.
     - **Operator Assignments**: Airlines (Garuda Indonesia, Citilink, Batik Air), rail operators (KCIC, KAI, MRT Jakarta, LRT Jabodebek, KAI Bandara, KAI Commuter), shuttle operators (DayTrans, CitiTrans), and bus operators (PT Transportasi Jakarta, PO Sinar Jaya, Rosalia Indah, Harapan Jaya).
   - **Departure Card Header & Drawer Rendering**:
     - Added origin -> destination routing indicator when `origin` is present.
     - Added compact badge chips for `gateOrBay` (with `DoorOpen` icon), `serviceClass` (with `Sparkles` icon), and `baggageBelt` (with `Layers` icon).
     - Added a distinct, sleek subtle box with `HelpCircle` icon displaying operational `notes` in the expanded drawer.
     - Added high-level routing summary display with `Compass` icon.
     - Displayed `operatorName` cleanly in the details grid.
     - Enhanced search filter in `filteredDepartures` to match against `operatorName`, `gateOrBay`, `serviceClass`, `notes`, and `origin`.

2. **`src/lib/i18n/`**:
   - Added `operationalNotes` localized string across `types.ts`, `id.ts`, `en.ts`, `ar.ts`, `ja.ts`, `ko.ts`, and `zh.ts`.

3. **`tests/fleet-and-station-typologies.test.ts`**:
   - Added `Timetable Engine: generateDepartureBoard Rich Metadata Generation` test suite:
     - Verified Aviation departure generation (airlines, gate, serviceClass, baggageBelt, origin, direct non-stop notes).
     - Verified Rail departure generation (Whoosh, KAI Intercity, peron/track numbers, Wi-Fi notes).
     - Verified Executive Shuttle departure generation (pool origins, bay, MBZ routing notes, VIP 8-seater class).
     - Verified TransJakarta BRT and Mikrotrans departure generation (AMARI 24h, JakLingko Rp 0 notes, clean origin/destination termini).

## Test Results
- `npx vitest run tests/fleet-and-station-typologies.test.ts`: **21 passed (21)**
- `npm test`: **25 test files passed, 309 tests passed (100%)**
- `npx tsc --noEmit`: **0 errors**

## Git Commit
- `feat(timetables): support customizable timetable departure items with airlines, origins, and operational notes` (`a9ab689`)
