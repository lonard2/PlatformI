# PlatformI: All-in-One Multimodal Public Transportation Cockpit

Welcome to PlatformI, where public transports meet.

PlatformI is a unified, production-grade multimodal public transportation platform and glass-cockpit cartography dashboard designed for the Special Capital Region of Jakarta and the Greater Jakarta metropolitan area (Jabodetabek: Jakarta, Bogor, Depok, Tangerang, South Tangerang, Bekasi), engineered for nationwide scalability.

---

## Supported Modes & Network Inventory

PlatformI harmonizes four distinct transportation dimensions across 16 transit modes:

| Dimension | Transit Mode | Network / Operator | Fleet & Infrastructure Highlights |
| :--- | :--- | :--- | :--- |
| **Land - Rail** | MRT Jakarta | PT MRT Jakarta (Perseroda) | Nippon Sharyo 6-car EMUs, GoA 2, Underground & Elevated |
| **Land - Rail** | LRT Jabodebek | PT Kereta Api Indonesia (KAI) | PT INKA 6-car EMUs, GoA 3 Driverless CBTC, 750V DC 3rd Rail |
| **Land - Rail** | LRT Jakarta | PT LRT Jakarta (JakPro) | Hyundai Rotem 2-car EMUs, Elevated Boulevard route |
| **Land - Rail** | KRL Commuter Line | PT Kereta Commuter Indonesia (KCI) | JR East 205/Tokyo Metro series 8-12 car EMUs, 1500V DC OHL |
| **Land - Rail** | Whoosh High-Speed Rail | PT Kereta Cepat Indonesia China (KCIC) | CRRC Qingdao Sifang KCIC400AF trainsets, 350 km/h cruising |
| **Land - Rail** | KAI Bandara | PT Railink | PT INKA / Bombardier EA203 EMUs, Airport Express service |
| **Land - Rail** | KAI Jarak Jauh | PT Kereta Api Indonesia (Persero) | Luxury, Compartment Suites, Panoramic, Executive & Economy |
| **Land - Bus** | TransJakarta BRT | PT Transportasi Jakarta | Corridors 1-14, dedicated busways, Scania/Mercedes/BYD fleet |
| **Land - Bus** | TransJakarta Non-BRT & RoyalTrans | PT Transportasi Jakarta | Curbside low-entry buses, premium suburban express coaches |
| **Land - Bus** | MikroTrans | JakLingko (Dishub DKI Jakarta) | Subsidized feeder angkot with Tap-On-Bus card validators |
| **Land - Bus** | Intercity AKAP Bus | PO Rosalia Indah, Sinar Jaya, GHTS | Double Decker, Suites Class Sleeper 1-1-1, Super Executive 2-1 |
| **Land - Bus** | Executive Shuttle | DayTrans, CitiTrans, Baraya Travel | Toyota HiAce Premio & Mercedes-Benz Sprinter pool-to-pool |
| **Air** | Commercial Aviation | Soekarno-Hatta (CGK) & Halim (HLP) | Terminals 1, 2, 3 + Skytrain Kalayang APMS automated people mover |
| **Water / Sea** | Express Speedboat | Kepulauan Seribu (Dishub / Private) | Muara Angke (Kali Adem) & Marina Ancol to Pulau Pari, Pramuka, Tidung |
| **Water / Sea** | Maritime Liner | PT Pelayaran Nasional Indonesia (PELNI) | Pelabuhan Tanjung Priok (KM Kelud, KM Dorolonda trans-island) |

---

## Core System Architecture & Features

### 1. Responsive Glass Cartography & Leaflet Simulation Engine
- **Client-Side SSR Isolation**: Loaded dynamically via `next/dynamic` (`ssr: false`) with strict instance cleanup to eliminate memory leaks and initialization collisions.
- **Custom High-Contrast Basemaps**: Instant switching between CartoDB Dark Matter, Positron, Esri World Imagery Satellite, and OpenStreetMap.
- **Brand Vector Polylines**: Mode-specific hex colors, glowing route overlays, and interactive segment inspection.
- **Animated SVG Directional Markers**: Dynamic `L.divIcon` markers with hardware-accelerated CSS 3D heading rotation and real-time crowd density badges.
- **Real-Time GTFS-RT Vector Simulation**: Custom React hook (`useTransitSimulation.ts`) driving 60fps vehicle position interpolation with speed controls (`1x`, `2x`, `5x`, `0x/Pause`), station dwell countdowns, and dynamic next-stop ETAs.

### 2. Enthusiast Vehicle Inspector & Coachbuilder Specifications
- **Technical Specs Viewer**: Detailed engineering breakdown covering Indonesian Karoseri coachbuilders (Laksana, Adiputro, Tentrem), chassis (Scania K410IB, Mercedes-Benz OH 1626 / OC 500 RF 2542, Hino RN285, Toyota HiAce Premio, Mercedes Sprinter, BYD B12, CRRC KCIC400AF), transmission (Voith, ZF EcoLife, Opticruise), suspension (Air ECAS), and dimensions.
- **Interactive SVG Cabin Seating Diagrams**: High-contrast, interactive seating matrices with live seat selection for:
  - 1-1-1 Sleeper Suites Class Pods
  - 2-1 Super Executive Recliners
  - 2-2 Executive Tour Coaches
  - Urban Commuter Longitudinal Benches
  - Whoosh High-Speed Rail 1st & 2nd Class
  - VIP Executive Shuttle Cabins
- **Photo Gallery Carousel**: Curated vehicle photography with photographer credits, angle indicators, and coachbuilder badges.

### 3. Station Hub Boards & Intermodal Skybridge Guides
- **Live Departure/Arrival Boards**: Real-time status indicators (On Time, Boarding, Delayed), platform assignments, and upcoming departures computed from live simulation coordinates.
- **Multi-Level Skybridge Walkthroughs**: Step-by-step pedestrian transfers with walking distance, duration, elevation levels, and accessibility amenities (e.g., JPM Dukuh Atas TOD, CSW-ASEAN 5-level circular skybridge, Halim HSR-LRT skybridge).

### 4. Commuter Crowdsourcing & Time-Decay Density Engine
- **1-Tap Check-In**: Instant reporting for active vehicles with 4-level Crowd Density (Level 1: Low/Seated, Level 2: Moderate/Standing, Level 3: High/Crowded, Level 4: Full/Crush Load) and AC Comfort Scores (Cold, Optimal, Warm, Hot).
- **Exponential Time Decay Aggregation**: Recent passenger reports are weighted using a 10-minute half-life decay formula, ensuring stale feedback naturally diminishes.
- **Live Community Feed**: Real-time feedback ticker displaying passenger reports with relative timestamps and vehicle line badges.

### 5. Multi-Modal Fare Engine & JakLingko Integrated Tariff Cap
- **Mode-Specific Distance Rates**: Flat BRT fares (Rp 3,500), progressive rail fares (MRT base Rp 3,000 + Rp 1,000/km, LRT Jabodebek peak/off-peak, KRL segment-based), and free MikroTrans (Rp 0).
- **JakLingko 3-Hour Rp 10,000 Maximum Integrated Tariff Cap**: Enforces the official Jakarta tariff policy across MRT + LRT + TransJakarta when transfers occur within 45 minutes and total elapsed time is under 180 minutes (3 hours).

### 6. 30-Second Rolling Dynamic QR Ticketing Wallet & Scanner
- **Isomorphic HMAC-SHA256 Token Derivation**: Generates a 16-character cryptographic token synchronized with 30-second epoch windows.
- **Turnstile Gate Verification Pipeline**: Validates incoming dynamic QR codes with $\pm 1$ window ($\pm 30$ seconds) clock skew drift tolerance, anti-tamper signature checking, and anti-replay nonce tracking.
- **Digital Pass Wallet**: Displays active passes with animated circular countdown timers, SVG QR matrix patterns, and simulated gate check-in/check-out.

### 7. Multi-Model OpenRouter AI Transit Advisor
- **6 Supported Models**:
  - `google/gemini-3.7-flash` (Default fast multimodal transit advisor)
  - `google/gemini-3.5-flash-lite` (Ultra-low latency quick dispatcher)
  - `deepseek/deepseek-v4-pro-0813` (Deep reasoning & schedule optimizer)
  - `qwen/qwen3.7-plus` (Multilingual regional routing & logistics)
  - `openai/gpt-5.6-luna` (High-precision transit policy & itinerary planner)
  - `google/gemma-4-26b-a4b-it` (Open-weights transit telemetry assistant)
- **Transit Knowledge Graph Prompt Injection**: Real Jakarta interchange topology, skybridges, lines, schedules, and active disruptions are injected into system prompts.
- **Offline Local Grounded Engine**: Seamlessly falls back to local rule-based graph reasoning when offline or in test environments.

### 8. Operator Back-Office Admin Portal (`/admin`)
- **/admin/fleet**: Live fleet radar, vehicle metadata editor, and route assignments.
- **/admin/alerts**: Disruption alert authoring and broadcast center with severity tiers.
- **/admin/scanner**: Interactive QR turnstile gate scanner simulator for testing token validation and anti-replay policies.

---

## Technical Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5 (Strict mode)
- **Styling & Icons**: Tailwind CSS v4, Lucide React (Zero raw emojis)
- **Cartography**: Leaflet 1.9, React Leaflet (SSR-isolated)
- **State Management**: Zustand 5 (Reactive sliced store)
- **Database & ORM**: Prisma ORM with embedded SQLite (`dev.db`)
- **Animation**: Framer Motion (Drawer touch gestures)
- **Testing**: Vitest 3, Testing Library, jsdom

---

## Quickstart & Installation

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation & Database Setup
```bash
# Clone and navigate to repository
cd /Users/lonard/Desktop/PlatformI

# Install dependencies
npm install

# Push Prisma schema and seed database with authentic Jabodetabek transit data
npx prisma db push
npm run db:seed
```

### Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

### Production Build
```bash
npm run build
npm start
```

---

## Automated Test Suite & Verification

The project includes an automated test suite structured across 5 rigorous tiers:

- **Tier 1 (Unit Tests)**: Core pure math, geodesy, distance formulas, and single-mode fares.
- **Tier 2 (Boundary & Corner Cases)**: 0 km distances, time boundaries, extreme speed multipliers.
- **Tier 3 (Pairwise Interactions)**: Cross-feature reactivity between simulation, UI drawers, and state stores.
- **Tier 4 (Jabodetabek E2E Scenarios)**: Real-world commute journeys across South, Central, and Greater Jakarta.
- **Tier 5 (Adversarial Hardening)**: White-box stress tests covering antipodal geodesics, sub-second 179m59s vs 180m01s JakLingko boundaries, 44m59s vs 45m01s transfer gaps, QR signature tampering, replay nonces, and AI offline fallbacks.

### Execute Tests
```bash
# Run complete test suite (18 test suites, 213 tests)
npm test

# Run specific test suite
npx vitest run tests/tier5-adversarial.test.ts
```

---

## Comprehensive Technical Documentation

For educational guides and deep architectural analyses, refer to the documentation in `docs/`:

- [docs/walkthrough.md](file:///Users/lonard/Desktop/PlatformI/docs/walkthrough.md): Comprehensive system design, mathematical derivations (Haversine, initial azimuth bearing, polyline vector interpolation, exponential decay crowdsourcing, JakLingko 3-hour tariff cap, 30s HMAC-SHA256 dynamic QR security), Next.js 16 SSR Leaflet integration patterns, and OpenRouter prompt engineering guide.
- [docs/phase_critiques.md](file:///Users/lonard/Desktop/PlatformI/docs/phase_critiques.md): Phase-by-phase retrospective (Phases 1-14), architectural trade-offs (Canvas vs SVG DivIcons, Client Simulation vs WebSockets, SQLite vs PostgreSQL, Framer Motion vs CSS transitions), performance benchmarks, and nationwide expansion roadmap.
