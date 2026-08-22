# Project: PlatformI

## Architecture
PlatformI is an all-in-one regionalized public transportation platform and glass cockpit for Jakarta and the Jabodetabek metropolitan area.
- **Frontend / Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, Framer Motion.
- **Cartography**: Leaflet 1.9 with dynamic client boundary (`next/dynamic` ssr:false), CartoDB Dark/Light & Satellite tiles, brand vector polylines, animated directional SVG markers, hub clustering.
- **Simulation Engine**: GTFS-RT style deterministic vector interpolation along polylines using spherical geodesy (Haversine, initial azimuth bearing, along-track distance) with speed multipliers (`1x`, `2x`, `5x`, `0x/Pause`) and real-time next-stop ETA calculations.
- **State Management**: Reactive Zustand store (`useTransitStore`) synchronizing viewport, active filters, selected vehicle/station, simulation clock, crowdsource check-ins, and digital wallet passes.
- **Data Persistence**: Prisma ORM with SQLite (`dev.db`) storing regions, lines, stops, vehicles, technical specs, seating diagrams, photo galleries, tickets, crowdsource reports, and disruption alerts.
- **Security & Dynamic QR**: 30-second rolling TOTP HMAC-SHA256 dynamic QR ticketing tokens with $\pm 1$ window tolerance and gate scanner simulator.
- **AI Intelligence**: Multi-model OpenRouter integration supporting the 6 designated models (`google/gemini-3.7-flash`, `google/gemini-3.5-flash-lite`, `deepseek/deepseek-v4-pro-0813`, `qwen/qwen3.7-plus`, `openai/gpt-5.6-luna`, `google/gemma-4-26b-a4b-it`) enriched with transit graph system prompt.
- **Quality Standards**: Zero placeholder stubs, zero raw emojis (Lucide icons only), strict TypeScript typing (`src/types/transit.ts`), responsive across mobile, tablet, and desktop, 100% test pass rate.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Toolchain & Next.js Scaffolding | Next.js 16 App Router, React 19, Tailwind CSS, Lucide React, Vitest setup | M1 | Survey |
| 2 | Strict Transit Domain Types | Strict TypeScript models in `src/types/transit.ts` for all 16 transit modes, vehicles, specs, fares, tickets | M1 | Survey |
| 3 | Prisma SQLite Schema & Client | Relational schema in `prisma/schema.prisma` and client instance in `src/lib/db.ts` | M1 | Survey |
| 4 | High-Fidelity Jabodetabek Dataset | Exhaustive real-world dataset covering rail, BRT 1-14, feeders, MikroTrans, AKAP, shuttles, air, maritime | M1 | Survey |
| 5 | Prisma Database Seeding Script | Executable script `prisma/seed.ts` populating SQLite database with complete dataset | M1 | Survey |
| 6 | Reactive Transit Zustand Store | Central state store `src/lib/stores/useTransitStore.ts` for UI, filters, selection, clock, speed | M2 | Survey |
| 7 | Spherical Geodesy Math Engine | Pure math functions `src/lib/math/geodesy.ts` (Haversine distance, bearing, cross-track, interpolation) | M2 | Survey |
| 8 | Mode Metadata & Brand Palette | Comprehensive constants `src/lib/constants/modes.ts` with brand colors, speed profiles, Lucide icons | M2 | Survey |
| 9 | Vector Polyline Route Rendering | SSR-safe Leaflet polyline layer with brand colors, glow effects, and interactive click states | M2 | Survey |
| 10 | Directional Animated SVG Markers | Dynamic `L.divIcon` markers with hardware-accelerated heading rotation and density badges | M2 | Survey |
| 11 | Smart Intermodal Hub Clustering | Glowing cluster markers for major interchange hubs (Dukuh Atas, Manggarai, CSW-ASEAN, Halim, CGK) | M2 | Survey |
| 12 | Real-Time Vector Simulation Engine | Custom hook `useTransitSimulation.ts` with 1x/2x/5x/Pause clock and dynamic next-stop ETAs | M2 | Survey |
| 13 | Responsive Glass HUD Map Controls | Floating glass controls for tile switching, mode toggles, speed multipliers, and map centering | M2 | Survey |
| 14 | Responsive Vehicle Detail Sheet | Slide-up bottom sheet on mobile (Framer Motion) and docked glass side panel on desktop | M3 | Survey |
| 15 | Enthusiast Technical Specs Viewer | Detailed coachbuilder (Laksana, Adiputro, Tentrem), chassis (Scania, Mercedes, Hino), powertrain viewer | M3 | Survey |
| 16 | Interactive SVG Cabin Seating Diagrams | Clickable SVG matrices for 1-1-1 Sleeper, 2-1 Super Exec, 2-2 Exec, Commuter longitudinal, Whoosh, Shuttles | M3 | Survey |
| 17 | Vehicle Photo Gallery Carousel | High-resolution photo gallery with photographer credits, karoseri badges, and vehicle angle views | M3 | Survey |
| 18 | Station, Airport & Port Inspector | Live departure/arrival boards (On Time, Boarding, Delayed), platform assignments, accessibility matrix | M3 | Survey |
| 19 | Intermodal Skybridge Transfer Guides | Step-by-step walking transfer guides for complex hubs (CSW-ASEAN skybridge, Dukuh Atas TOD, Halim) | M3 | Survey |
| 20 | Commuter 1-Tap Check-In Modal | Fast check-in modal with 4-level Crowd Density and AC Comfort ratings | M4 | Survey |
| 21 | Exponential Time-Decay Density Engine | Real-time density calculation weighting recent reports with 10-minute half-life decay | M4 | Survey |
| 22 | Live Community Feedback Feed | Real-time ticker displaying passenger reports with relative timestamps and vehicle badges | M4 | Survey |
| 23 | Multi-Modal Distance Fare Engine | Fare calculator for flat BRT, progressive rail (MRT, LRT, KRL), Whoosh, airport rail, speedboats | M4 | Survey |
| 24 | JakLingko 3-Hour Tariff Cap Engine | Enforces Rp 10,000 maximum ceiling across MRT + LRT + TransJakarta within 180 minutes | M4 | Survey |
| 25 | Journey Itinerary & Fare Breakdown | Origin-destination route search with multi-leg transfer breakdown, time estimate, and fare summary | M4 | Survey |
| 26 | 30-Second Rolling Dynamic QR Generator | TOTP HMAC-SHA256 cryptographic security token regenerating every 30s with circular countdown | M4 | Survey |
| 27 | Digital Pass & Ticketing Wallet | Active digital passes, rolling QR display, trip history, and simulated gate tap-in/tap-out | M4 | Survey |
| 28 | OpenRouter Multi-Model Transit Advisor | AI transit advisor integrating the 6 designated models with transit graph prompt injection | M5 | Survey |
| 29 | Interactive AI Chat Modal | Chat UI with model selector, suggested prompt chips, markdown rendering, and "View on Map" actions | M5 | Survey |
| 30 | Disruption Alert Priority Banner | Pinned priority disruption alerts matching user pinned modes + network-wide status drawer | M5 | Survey |
| 31 | Operator Admin Fleet Control | `/admin/fleet` management portal for live fleet radar, vehicle metadata editing, and route adjustments | M5 | Survey |
| 32 | Operator Admin Alert Broadcaster | `/admin/alerts` alert authoring and broadcasting tool for system-wide service notifications | M5 | Survey |
| 33 | Turnstile Gate Scanner Simulator | `/admin/scanner` gate scanner validating 30s dynamic QR tokens ($\pm 1$ window) and 3-hour transfer rules | M5 | Survey |
| 34 | App Customization & Settings Modal | User settings for themes, tile layers, motion sensitivity, default simulation speed, and active AI model | M5 | Survey |
| 35 | 4-Tier Automated Test Suite | Vitest test suite covering Tier 1 (Unit), Tier 2 (Boundary), Tier 3 (Pairwise), Tier 4 (Jabodetabek E2E) | M6 | Survey |
| 36 | Adversarial Test Coverage Hardening | Tier 5 white-box stress testing and edge-case boundary hardening | M6 | Survey |
| 37 | Architectural Walkthrough Publication | Educational guide `docs/walkthrough.md` with system design, math derivations, and component hierarchy | M6 | Survey |
| 38 | Phase-by-Phase Critique Publication | Technical critique `docs/phase_critiques.md` analyzing architectural trade-offs and lessons learned | M6 | Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundations, Type Contracts, High-Fidelity Dataset & Prisma DB | Features 1, 2, 3, 4, 5 (Phases 1-3) | none | DONE |
| M2 | Responsive Glass Cartography & Real-Time Vector Simulation Engine | Features 6, 7, 8, 9, 10, 11, 12, 13 (Phases 4-6) | M1 | DONE |
| M3 | Enthusiast Vehicle Inspector, Station Hub Boards & Seating Matrix | Features 14, 15, 16, 17, 18, 19 (Phases 7-8) | M2 | DONE |
| M4 | Commuter Crowdsourcing, Multi-Modal Fare Engine & Dynamic QR Wallet | Features 20, 21, 22, 23, 24, 25, 26, 27 (Phases 9-10) | M2 | DONE |
| M5 | Multi-Model AI Transit Advisor, Disruption Center & Operator Admin Portal | Features 28, 29, 30, 31, 32, 33, 34 (Phases 11-13) | M3, M4 | DONE |
| M6 | Final Milestone: 100% E2E Test Suite Pass, Adversarial Hardening & Educational Docs | Features 35, 36, 37, 38 (Phase 14) | M5, TEST_READY | DONE |

---

## Interface Contracts

### Domain Types (`src/types/transit.ts`)
- `TransitMode`: `"mrt" | "lrt_jabodebek" | "lrt_jakarta" | "krl" | "whoosh" | "kai_bandara" | "kai_intercity" | "tj_brt" | "tj_non_brt" | "mikrotrans" | "akap_bus" | "executive_shuttle" | "aviation" | "maritime"`
- `Vehicle`: `{ id: string; lineId: string; vehicleCode: string; mode: TransitMode; operator: string; coachbuilder?: string; chassis?: string; currentPosition: [number, number]; heading: number; speed: number; crowdDensity: 1 | 2 | 3 | 4; acComfort: "cold" | "optimal" | "warm" | "hot"; nextStopId: string; etaNextStopSeconds: number; technicalSpecId?: string; photoGallery?: PhotoItem[] }`
- `TechnicalSpec`: `{ id: string; vehicleId: string; karoseriModel: string; chassisModel: string; engineSpecs: string; transmission: string; suspension: string; dimensions: { length: number; width: number; height: number }; capacity: { seating: number; standing: number }; seatingLayoutType: "sleeper_1_1_1" | "super_exec_2_1" | "exec_2_2" | "commuter_longitudinal" | "hsr_standard" | "shuttle_vip"; features: string[] }`
- `SeatingDiagram`: `{ type: string; totalSeats: number; rows: { rowNumber: number; seats: { id: string; label: string; type: "standard" | "sleeper" | "priority" | "wheelchair" | "driver"; isOccupied?: boolean }[] }[] }`
- `Stop`: `{ id: string; code: string; name: string; mode: TransitMode[]; coordinates: [number, number]; isInterchange: boolean; connectingLines: string[]; amenities: string[]; accessibility: AccessibilityInfo; skybridgeTransferGuides?: TransferGuide[] }`
- `Ticket`: `{ id: string; userId: string; originStopId: string; destinationStopId: string; lines: string[]; fare: number; isJakLingkoIntegrated: boolean; status: "ACTIVE" | "USED" | "EXPIRED"; createdAt: string; expiresAt: string; tokenWindow: number }`

### Spherical Geodesy (`src/lib/math/geodesy.ts`)
- `haversineDistance(coord1: [number, number], coord2: [number, number]): number` (Returns meters)
- `calculateBearing(startCoord: [number, number], endCoord: [number, number]): number` (Returns 0–360 degrees)
- `interpolatePositionAlongPolyline(polyline: [number, number][], distanceMeters: number): { position: [number, number]; heading: number; segmentIndex: number }`
- `calculatePolylineLength(polyline: [number, number][]): number`

### Fare Engine (`src/lib/services/fareCalculator.ts`)
- `calculateLegFare(mode: TransitMode, distanceKm: number, originStopId?: string, destStopId?: string): number`
- `calculateIntegratedFare(legs: { mode: TransitMode; distanceKm: number; departureTime: Date }[]): { totalFare: number; rawFare: number; jakLingkoDiscount: number; isCapped: boolean }`

### Dynamic QR Security (`src/lib/services/qrSecurityService.ts`)
- `generateRollingQRToken(ticketId: string, userId: string, timestampMs?: number): { token: string; timeStep: number; secondsRemaining: number; fullPayload: string }`
- `validateRollingQRToken(scannedPayload: string, toleranceWindows?: number): { isValid: boolean; ticketId: string; userId: string; timeStep: number; errorReason?: string }`

### OpenRouter Multi-Model AI Client (`src/lib/services/aiTransitService.ts`)
- `queryTransitAdvisor(prompt: string, model: OpenRouterModelId, conversationHistory?: Message[]): Promise<{ response: string; modelUsed: string; suggestedStops?: string[]; routePolylines?: [number, number][][] }>`

---

## Code Layout
- `src/types/`: Type definitions (`transit.ts`) — owned by M1
- `prisma/`: Prisma schema (`schema.prisma`) and seed (`seed.ts`) — owned by M1
- `src/lib/data/`: Static transit dataset (`jakarta-dataset.ts`) — owned by M1
- `src/lib/math/`: Geodesy & math utilities (`geodesy.ts`) — owned by M2
- `src/lib/stores/`: Zustand state management (`useTransitStore.ts`) — owned by M2
- `src/lib/constants/`: Mode definitions & styling (`modes.ts`) — owned by M2
- `src/lib/hooks/`: Simulation & telemetry hooks (`useTransitSimulation.ts`) — owned by M2
- `src/components/map/`: Leaflet cartography components — owned by M2
- `src/components/inspector/`: Vehicle & hub detail sheets, SVG seating — owned by M3
- `src/components/crowdsource/`: Check-in modal & community feed — owned by M4
- `src/lib/services/fareCalculator.ts` & `qrSecurityService.ts`: Fare & QR security — owned by M4
- `src/components/ticketing/`: Dynamic QR & pass wallet — owned by M4
- `src/lib/services/aiTransitService.ts`: OpenRouter multi-model client — owned by M5
- `src/components/ai/`: AI Assistant modal — owned by M5
- `src/components/alerts/`: Disruption banners & service status drawer — owned by M5
- `src/app/admin/`: Fleet radar, route editor, alert broadcaster, gate scanner simulator — owned by M5
- `tests/`: 4-Tier test suite & Vitest configs — owned by E2E Testing Track / M6
- `docs/`: Educational walkthrough & phase critiques — owned by M6
