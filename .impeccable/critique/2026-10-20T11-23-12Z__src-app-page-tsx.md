---
target: homepage cockpit incl TSB + top chrome
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 4
target_identity: "file:/Users/lonard/Desktop/PlatformI/src/app/page.tsx"
target_fingerprint: "sha256:0315392e95bd06b677bcff058be54e30513a413fdc99a68b990d00a4c4cfd4c4"
target_path: /Users/lonard/Desktop/PlatformI/src/app/page.tsx
timestamp: 2026-10-20T11-23-12Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage Cockpit (cycle 9 — post glass/typography/spring commits)

**Score: 26/40 — Acceptable** (32 -> 26) | Detector: 8 findings (5 true positives, 3 false positives) | Cognitive load 2/8 PASS | P0: 3, P1: 4

Method: dual-agent (A design-director, B detector + evidence). Source-only; browser automation unavailable.

## Design Health Score (Nielsen rubric)

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3 | Live fleet/severity/sim clock, but no "last updated"; alert headline rotates under the reader (DisruptionAlertBanner.tsx:197). |
| 2 | Match System / Real World | 4 | Genuinely Jakarta-authored: Peron, WIB, AMARI corridors, JakLingko Rp 10.000 cap, Island Elevated platform typologies. |
| 3 | User Control and Freedom | 3 | Undo/clear/swap/Escape/focus-restore present, but the Rail sector tab silently removes rail from the map (TransportationSystemBar.tsx:847). |
| 4 | Consistency and Standards | 2 | "Rail" means two things 40px apart (tab :967 vs group header :1099); tab aria-pressed tracks map visibility while its visual state tracks the filter; DESIGN.md typography still pre-Geist. |
| 5 | Error Prevention | 2 | "Route Plotted" asserted when no route exists (page.tsx:570 + journeyPlanner.ts:186); All Sectors restores modes not selectedCategories; ~123/178 corridors resolve to wrong line. |
| 6 | Recognition Rather Than Recall | 3 | datalist + corridor search, but iOS Safari renders no datalist UI; no typeahead, near-me, or recents. |
| 7 | Flexibility and Efficiency | 2 | No journey history, saved origin, favourites, or passenger keyboard shortcut; every session restarts from two free-text fields. |
| 8 | Aesthetic and Minimalist Design | 2 | System bar reads as flat 20-control texture; permanent AI pulse + glow on every header button violate DESIGN.md:232. |
| 9 | Recognise/Diagnose/Recover | 3 | Specific error copy, stale badge, retry, good AI offline fallback; but the no-route state still shows an ETA and never says what to do next. |
| 10 | Help and Documentation | 2 | No passenger help, no key reference; admin surface has a dispatcher guide + shortcut layer the cockpit lacks. |
| **Total** | | **26/40** | **Acceptable - significant improvements needed** |

## Cognitive Load Checklist (canonical 8-item)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Single focus | FAIL | 5 header actions + 5 sector chips + 4 headers + 16 system pills + arrows + language + rotating alert + pill + 28 markers + footer. |
| 2 | Chunking <=4/group | FAIL | Sector row 5 chips; system bar 16 pills behind 4 headers; mobile nav 6; status drawer LIVE 5+5 chips in two adjacent rows. |
| 3 | Grouping | PASS | Sector headers own items; journey panel splits inputs/stepper/metrics/refinement; vehicle sheet splits header/tabs/body/actions. |
| 4 | Visual hierarchy | FAIL | All 16 system pills identical weight; always-cyan AI label erodes "cyan = interactive" (DESIGN.md:119). |
| 5 | One thing at a time | FAIL | Journey panel stacks 2 inputs + result + 3 KPI tiles + refine CTA; crowdsource z-[500] over vehicle sheet z-40. |
| 6 | <=4 choices per decision | FAIL | Sector 5, system bar 20 controls/178 routes, mobile nav 6, drawer 10 chips, endpoint pick free-text over 26 stations. |
| 7 | Working memory | FAIL | Must hold "A -> line 1 -> transfer -> line 2 -> B" across a 3-column stepper; nothing persists beyond language + URL; alert headline can change mid-read. |
| 8 | Progressive disclosure | PASS | Sector collapse, corridor tray + search, vehicle-sheet tabs, drawer tabs, AI demoted to refinement. |

## Design Specificity Verdict
Data authored for Jakarta; layout grammar is a template. Cannot be faked: 178 corridors with true codes/headways, JakLingko Rp 10.000 cap implemented, Island Elevated/Floating Marine Pier platform types, A/B node metaphor. Generic: 5-icon SaaS header, Google-Maps-clone planner, archetypal 3-tile KPI row banned by DESIGN.md:230, passenger-facing MTTR analytics drawer, violet-AI pattern. Coverage gap: planner sees only 26 unique stations across 15 of 61 lines; Koridor 2/4/5/6/8-14, feeders, LRT Jakarta, KRL Commuter, KAI Bandara, RoyalTrans, Bus Wisata, Halim, PELNI have zero stops.

## Priority Issues
- [P0] "Route Plotted" asserted unconditionally: journeyPlanner.ts:186-196 returns a non-null journey with candidateLines: [] on no-route; page.tsx:570 renders journeyPlotted in emerald anyway, with ~8 min and 0 km tiles, inside aria-live="polite" (:454). Fix: return null/status NO_ROUTE; render claim only when candidateLines.length > 0; give no-route its own state; strip ETA/fare tiles. -> clarify
- [P0] Accessibility Settings are fiction: AppSettingsModal.tsx:50-51 keeps isHighContrast/isReducedMotion in local state (reset on close); no <MotionConfig reducedMotion="user"> anywhere in src/ (verified); HubDetailSheet.tsx:743-753 full-viewport spring and AITransitAssistantModal.tsx:276-293 unguarded; .light theme token block unreachable, <main> hardcodes bg-[#090d16]. Fix: MotionConfig in layout.tsx (1 line), persist toggles in store, data-theme wiring, or delete the switches. -> harden
- [P0] Planner cannot route the advertised network: 28 stop records / 26 unique stations, 15 of 61 lines routable. Fix (design half): gate endpoint picker on routable subset, label map-only lines, show coverage line. -> shape
- [P1] Sector filter has two contradictory meanings 40px apart: tab :967 calls toggleCategory (:852) filtering AND removing rail from the map; group header :1099 also toggles; tab aria-pressed (:970) reports map visibility while visual state reports filter; All Sectors (:850) restores selectedModes but not selectedCategories. Fix: tab filters only; explicit eye toggle beside header; reset selectedCategories; separate filter vs visibility ARIA. -> distill
- [P1] Bottom nav 60-88px vs reserved pb-14 (56px): page.tsx:226, VehicleDetailSheet.tsx:292. Telemetry footer fully hidden and sheet action bar under nav on notched devices. Fix: ResizeObserver -> --bottom-nav-h. -> layout
- [P1] 18 interactive elements below 44px (8 in DisruptionAlertBanner, 5 in MapControls sim-speed/basemap, journey clear/swap, vehicle-sheet tabs). Apply existing .touch-target utility. -> adapt
- [P1] Corridor click can highlight the wrong line: ~123/178 records lack lineId and fall back to allLines.find(mode) (TransportationSystemBar.tsx:912); planner prices directLines[0] while card lists every line. Fix: no-op fallback + visible "no live geometry"; per-line comparison. -> clarify
- [P2] Glass without prefers-reduced-transparency fallback (0.82-alpha glass-panel, 0.95 glass-dropdown). -> harden
- [P2] Geist loaded subsets:["latin"] -> 5 locales fall back; lang="en" hardcoded on reload (layout.tsx:38); fares always id-ID; RTL half-implemented (physical utilities). -> harden
- [P2] DESIGN.md typography stale (pre-Geist); Inter font-feature-settings on Geist. -> document
- [P2] JourneyLayer pins use light-theme accent fills over dark-theme borders (:95-100, :134-139, :171-176) + off-ramp 13px inline sizes; pins not keyboard reachable, no accessible name. -> colorize
- [P3] Hardcoded English: title="View Complete Network Status" (DisruptionAlertBanner.tsx:316), "Transit: " (JourneyLayer.tsx:121), "Status: " (TransportationSystemBar.tsx:1206); 49 off-ramp text-xs; animate-in/fade-in classes reference uninstalled tailwindcss-animate (MapControls.tsx:104); role=menu invalid child + duplicated aria-label + no arrow keys; sim-speed buttons convey state by colour only; HubMarkerLayer typology icons only at BIG scale, no marker cap or viewport culling (~190 markers, ~190 infinite pulse animations), duplicate click handler; vehicle sheet spring slowest (220/25, dragElastic 0.5); 320px hover-card clamp overflows 12px.

## What's Working
- The map is the answer: A/B pins with halo, glow + core polyline, sticky tooltip, transfer beacon, fitBounds including interchange at 90px, 300ms debounce.
- The network bar is an instrument: 178 corridors with true headways/hours/fares, per-sector collapse, clamped hover preview, searchable tray.
- Systemic focus discipline: global :focus-visible !important rule (globals.css:326) survives the glass; i18n parity 920/920 across six locales; zero console/any/unused imports.

## Minor Observations
MobileBottomNav.tsx:4 stale "5 buttons" comment; page.tsx:799-800 blank lines; .light tokens unreachable; bg-noise-grain painted over by opaque main; tablet shows header and bottom nav together; ja/zh/ko/ar carry triangle glyphs en/id do not; raw arrow vs &rarr; inconsistency; map crowd tooltips hardcode English despite localised density strings.

## New Ceiling (26 -> 36+)
Boarding plan, not a route line: extend PlannedJourney with legs[] = { line, boardStop, alightStop, platform, nextDepartures[], waitMinutes, walkSeconds, crowdBand }; duration from per-mode speeds + dwell + half-headway wait (TRANSIT_MODE_CONFIG already has MRT 60 / KRL 45 / Whoosh 350 / BRT 22 / MikroTrans 18 km/h) instead of flat distanceKm*2.8+8; replace the KPI row with "Peron 2 -> kereta menuju X -> berangkat 07:41". Then: crowd telemetry joined to the plan, persisted journey history + saved origin, share action over the working ?from=&to= link with canonical names, degraded-network story with visible data age. Priority order: boarding plan > quantified consequence > continuity+share > degraded story > hierarchy/type-scale.

## Provocative Questions
1. Planner output carries zero departure/platform fields while the inspector carries fifteen and the hub board already knows peron, headway and crowding. Commuter cockpit or enthusiast map?
2. Last three commits added exactly the vocabulary DESIGN.md bans as decoration while the surface ships a 26-station planner and three inert switches. Which is the product?
3. Language switcher offers Arabic RTL and Japanese typography; app ships Latin-only Geist, hardcodes lang="en", formats fares id-ID, half-flips RTL. Is i18n shipping or demo?

## Detector Findings (8)
TRUE POSITIVES: JourneyLayer.tsx:100 light-theme amber fill vs dark border; :139 emerald fill vs border; :147 and :184 off-ramp 13px inline font sizes; :176 light-theme rose fill vs border.
FALSE POSITIVES: VehicleDetailSheet.tsx:405/422/439 border-b-2 on rounded-t-lg tab buttons (single-edge active-tab indicator).
Coverage gaps: detector misses 49 Tailwind text-xs off-ramp usages, DESIGN.md typography drift, and the uninstalled tailwindcss-animate classes.
