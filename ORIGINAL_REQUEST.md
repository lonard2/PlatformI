# Original User Request

## Initial Request — 2026-08-22T13:06:55Z

Build **PlatformI**, a production-grade, multi-platform, all-in-one regionalized public transportation platform for Jakarta/Jabodetabek (and expandable nationwide), integrating urban rail (MRT, LRT, KRL, Whoosh HSR, Airport Rail), buses (TransJakarta BRT 1-14, Non-BRT, MikroTrans, Intercity AKAP, Executive Shuttles/HiAce), aviation (CGK, HLP), and maritime (Kepulauan Seribu speedboats, Tanjung Priok PELNI), with high-contrast interactive cartography, enthusiast vehicle & coachbuilder specs (Laksana, Adiputro, Tentrem, Scania, Mercedes), interactive SVG cabin diagrams, live simulated tracking with speed tuning, commuter crowdsource check-ins, dynamic QR ticketing with integrated JakLingko tariff caps, multi-model AI routing, and an admin management control center. Every phase must include technical critique and published lesson-learned documentation for learning.

Working directory: /Users/lonard/Desktop/PlatformI
Integrity mode: development

## Requirements

### R1. Multimodal Regional Transit Engine & High-Fidelity Data Architecture
- Model comprehensive transit taxonomy across Land (Rail, BRT Trunk, Feeder, MikroTrans, AKAP Bus, Executive Travel Shuttle with HiAce/Sprinter pool-to-pool), Air (CGK, HLP), and Water (Speedboats, Ports).
- Persist real-world Jakarta & Bodetabek network datasets using Prisma ORM with SQLite, including stations, lines, schedules, and enthusiast vehicle specifications (karoseri, chassis, powertrain, seating layouts, and photo galleries).

### R2. Responsive Glass Cartography & Real-Time Simulation Engine
- Interactive Leaflet map with custom high-contrast dark/light/satellite basemaps, brand-colored route polylines, smart hub/terminal clustering, and animated directional SVG vehicle markers.
- Real-time GTFS-RT style simulation engine interpolating vehicle coordinates along route polylines with adjustable speed multipliers (1x, 2x, 5x, paused) and live next-stop ETAs.

### R3. Enthusiast Inspector, Station Hub Boards & Seating Matrix
- Slide-up bottom sheet (mobile) and docked side panel (desktop) with live vehicle telemetry, coachbuilder/chassis technical specs, interactive SVG cabin seating diagrams, and photo galleries.
- Station, terminal, airport, and port inspector featuring live departure/arrival boards, accessibility matrix, and intermodal skybridge transfer guides.

### R4. Commuter Crowdsourcing, Multi-Modal Fare Engine & Dynamic QR Ticketing Wallet
- 1-tap commuter check-in for active vehicles with 4-level crowd density ratings, AC comfort scores, and community live feed.
- Multi-modal fare engine supporting flat rates, progressive distance fares, and JakLingko integrated 3-hour tariff caps (Rp 10,000 max), with dynamic time-synchronized rolling QR ticketing and pass wallet.

### R5. Multi-Model AI Transit Advisor, Disruption Priority Center & Admin Portal
- OpenRouter multi-model AI transit advisor supporting `google/gemini-3.7-flash`, `google/gemini-3.5-flash-lite`, `deepseek/deepseek-v4-pro-0813`, `qwen/qwen3.7-plus`, `openai/gpt-5.6-luna`, and `google/gemma-4-26b-a4b-it`.
- Pinned disruption alert banner, network status drawer, and customizable app settings.
- Operator back-office (`/admin`) for fleet management, route editing, alert broadcasting, and QR gate scanner simulator.

### R6. Technical Walkthrough, Phase Critique & Lessons-Learned Publication
- Publish dedicated educational technical guides and lessons-learned documentation (`docs/`) critiquing each architectural phase, mathematical models (bearing, Haversine, simulation, tariff caps), and engineering trade-offs.

## Acceptance Criteria

### Functionality & Experience
- [ ] Map renders all regional transit lines with correct color codes and interactive tooltips without visual clutter.
- [ ] Moving vehicles smoothly interpolate along line paths at selected simulation speeds (1x/2x/5x/pause).
- [ ] Vehicle inspector displays coachbuilder, chassis, SVG seating layout, and photo gallery with zero emojis (Lucide icons only).
- [ ] Station inspector displays live departures/arrivals, platform assignments, and intermodal transfer routes.
- [ ] Commuter check-in updates vehicle crowd density levels and displays in real-time.
- [ ] Fare calculator enforces progressive distance rates and JakLingko 3-hour integrated cap (Rp 10,000).
- [ ] Dynamic QR code regenerates rolling time-based security token every 30 seconds with countdown.
- [ ] AI assistant responds with transit recommendations using designated OpenRouter models.
- [ ] Admin portal validates tickets, manages fleet inventory, and broadcasts disruption alerts.
- [ ] Responsive layout adapts flawlessly across mobile (<640px), tablet (640px-1024px), and desktop (>1024px).

### Code Quality & Standards
- [ ] Zero placeholder stubs (`TODO`, `TBD`, dummy stubs) across all files.
- [ ] Zero raw emojis in production code, UI elements, and system alerts (strictly Lucide icons).
- [ ] Automated test suite (`npm test`) passes 100% covering fare engine, simulation, crowdsource logic, and ticket validation.
- [ ] `npm run build` succeeds with zero TypeScript compilation errors.
- [ ] Educational phase walkthrough and lessons-learned published in `docs/`.
