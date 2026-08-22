# PlatformI: Agent Instructions & System Architecture Guidelines

Welcome to the **PlatformI** codebase. This document outlines mandatory architecture patterns, coding standards, and domain models for autonomous AI agents and engineers working on PlatformI.

---

## 1. Core Mission & Scope
PlatformI is an all-in-one, regionalized public transportation platform that unifies urban, commuter, intercity, maritime, and aviation transit networks into an interactive glass cockpit.

### Supported Modes:
- **Land - Rail**: MRT Jakarta, LRT Jabodebek, LRT Jakarta, KRL Commuter Line, Whoosh High-Speed Rail, KAI Bandara, KAI Jarak Jauh.
- **Land - Bus**: TransJakarta BRT (Corridors 1-14), TransJakarta Non-BRT & RoyalTrans, MikroTrans (JakLingko Angkot), Intercity AKAP Buses, Intercity Executive Shuttles / Travel (HiAce, Sprinter pool-to-pool).
- **Air**: Soekarno-Hatta (CGK), Halim Perdanakusuma (HLP).
- **Water / Sea**: Speedboat Kepulauan Seribu (Muara Angke / Marina Ancol), Pelabuhan Tanjung Priok (PELNI).

---

## 2. Mandatory Coding Standards

1. **Zero Placeholder Stubs**: Every function, component, type, and endpoint must be fully implemented. Never write `TODO`, `TBD`, dummy placeholders, or stubbed mock responses without full functionality.
2. **Zero Emoji Policy**: Do not use raw emojis in production code, UI elements, or system messages. Always use crisp Lucide SVG icons (`lucide-react`) and styled CSS badge elements.
3. **Strict TypeScript Typing**: No `any` types. All domain models and transit telemetry must be typed via `src/types/transit.ts`.
4. **Responsive Across Form Factors**:
   - Mobile (< 640px): High-precision touch gestures, slide-up bottom drawer, compact cards.
   - Tablet (640px - 1024px): Split-view layout, docked panels.
   - Desktop (> 1024px): Multi-column dashboard with side navigation and wide cartography viewport.
5. **AI Model Standards**: When calling AI routing or assistance features via OpenRouter, use only the designated models:
   - `google/gemini-3.7-flash` (Default fast multi-modal transit advisor)
   - `google/gemini-3.5-flash-lite` (Lightweight quick queries)
   - `deepseek/deepseek-v4-pro-0813` (Deep reasoning & schedule optimization)
   - `qwen/qwen3.7-plus`
   - `openai/gpt-5.6-luna`
   - `google/gemma-4-26b-a4b-it`

---

## 3. Team Roles & Specialized Delegation
The PlatformI engineering workflow is split across specialized roles (documented in [docs/TEAM_STRUCTURE.md](file:///Users/lonard/Desktop/PlatformI/docs/TEAM_STRUCTURE.md)):
1. **Lead Architect & Orchestrator**: Codebase hygiene, architecture standards, zero placeholder stubs, zero emoji enforcement.
2. **Transit Domain Researcher**: Authentic Jakarta/Bodetabek transit networks, coachbuilder/chassis specs (Laksana, Adiputro, Tentrem, Baze, Scania, Mercedes), and intermodal skybridge transfer paths.
3. **Backend & Simulation Engineer**: Prisma SQLite models, real-time vector movement simulation (`useTransitSimulation.ts`), and JakLingko integrated tariff calculator.
4. **Frontend & Cartography Engineer**: Responsive UI (Mobile/Tablet/Desktop), Leaflet map cartography, vehicle inspector drawer, SVG cabin seating layouts, and pass wallet.
5. **AI & Routing Engineer**: OpenRouter multi-model integration (`gemini-3.7-flash`, `gemini-3.5-flash-lite`, `deepseek-v4-pro-0813`, `qwen3.7-plus`, `gpt-5.6-luna`, `gemma-4-26b-a4b-it`).
6. **QA & Verification Auditor**: Comprehensive Vitest automated testing (`tests/transit-system.test.ts`), mathematical accuracy, and viewport responsiveness audits.
7. **Technical Writer & Educator**: Educational walkthroughs, mathematical model documentation, and phase critique lessons-learned in `docs/`.

- `src/app/`: Next.js 16 App Router pages, layout, and API endpoints.
- `src/components/`: Modular UI presentation layer (see [src/components/AGENTS.md](file:///Users/lonard/Desktop/PlatformI/src/components/AGENTS.md)).
- `src/lib/`: State management, transit algorithms, calculation engines (see [src/lib/AGENTS.md](file:///Users/lonard/Desktop/PlatformI/src/lib/AGENTS.md)).
- `prisma/`: Database schema, SQLite database, and seed datasets (see [prisma/AGENTS.md](file:///Users/lonard/Desktop/PlatformI/prisma/AGENTS.md)).
- `docs/`: Technical guides and learning walkthroughs.

---

## 4. Key Commands
- `npm run dev`: Starts local Next.js development server.
- `npm run build`: Generates Prisma client and builds Next.js production bundle.
- `npm test`: Runs the Vitest automated test suite.
- `npm run db:seed`: Seeds SQLite database with real-world Jakarta transit datasets.
