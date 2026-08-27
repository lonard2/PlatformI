---
target: homepage
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-27T06-02-16Z
slug: src-app-page-tsx
---
**Design Health Score**

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Live clock, counts, alerts, and active states are visible; freshness, source, confidence, and fetch failure state are not. |
| 2 | Match System / Real World | 3/4 | Transit concepts are authentic, but terms such as telemetry, AMARI, and Gapeka are unexplained. |
| 3 | User Control and Freedom | 2/4 | Drawers and modals close cleanly, but there is no global reset, alert undo, or clear interrupted-flow recovery. |
| 4 | Consistency and Standards | 2/4 | Glass styling is cohesive, but similar-looking filters, toggles, and expansion controls have different semantics. |
| 5 | Error Prevention | 2/4 | Some filtering guardrails exist; empty searches, check-ins, alert dismissal, and mode selection need stronger prevention. |
| 6 | Recognition Rather Than Recall | 2/4 | Primary actions are labeled, but map symbols, color meanings, and icon-only settings require inference. |
| 7 | Flexibility and Efficiency | 2/4 | Search, bulk controls, drawers, and responsive paths help; there are no shortcuts, favorites, recent journeys, or fast route entry. |
| 8 | Aesthetic and Minimalist Design | 1/4 | Gradients, blur, pulses, borders, metrics, banners, and multiple navigation layers compete with the map. |
| 9 | Error Recovery | 1/4 | Alert fetching can fall back silently; there is no visible stale state, retry action, or recovery guidance. |
| 10 | Help and Documentation | 1/4 | Tooltips exist, but there is no map legend, first-use guidance, or task-based help. |
| **Total** |  | **19/40** | **Poor: major UX overhaul required** |

## Design Specificity Verdict

The content is authored for PlatformI: Jabodetabek modes, WIB time, fares, hubs, corridors, fleet, and disruption states are all specific. The interaction language is less distinctive. Dark glass panels, cyan gradients, pulsing dots, radar motion, and telemetry strips could belong to nearly any operations cockpit. The product's character currently lives in its dataset more than in its first-use experience.

The deterministic detector found **0 findings** in `src/app/page.tsx` and exited cleanly with status `0`. No rule names, severities, or file locations were reported. The detector did not contradict the design review; it simply does not measure the strategic hierarchy and cognitive load problems above.

## Overall Impression

Technically impressive and transit-specific, but it opens as a surveillance console instead of a confident travel tool. The biggest opportunity is to establish one clear commuter task first, then reveal the enthusiast and operator depth contextually.

## What's Working

- `TransportationSystemBar` makes the multimodal breadth immediately visible across rail, bus, air, water, terminals, and hubs.
- The product has rare enthusiast depth: corridor search, headways, fares, operating hours, vehicle inspection, hub inspection, coachbuilder detail, and seating layouts.
- The implementation has strong responsive intent through `MobileBottomNav`, dynamic map loading, drawer-based detail, and reduced-motion support.

## Cognitive Load

**1/8 checklist items pass; 7/8 fail.**

- **Fail, single focus:** monitoring, filtering, ticketing, reporting, AI, and exploration all compete for first attention.
- **Fail, chunking:** the system bar exposes more than four route/service decisions at once.
- **Pass, grouping:** related modes and expanded route trays are grouped, though still dense.
- **Fail, visual hierarchy:** header, system bar, alert, map, FAB, footer, and bottom navigation all assert importance.
- **Fail, one thing at a time:** users can filter, toggle, inspect, monitor, and check in simultaneously.
- **Fail, minimal choices:** the desktop header and system bar expose many actions before intent is known.
- **Fail, working memory:** filter state, visibility state, selected service, selected corridor, and alert context are distributed across the chrome.
- **Fail, progressive disclosure:** corridor details are deferred, but most of the product's complexity arrives before a task is selected.

## Priority Issues

**[P1] No commuter-first task anchor**

- **Why it matters:** The product purpose includes journey decisions, but `page.tsx` opens with an exploration/monitoring cockpit and no origin, destination, “near me,” or route-start action.
- **Fix:** Make “Plan a journey” the primary action. Keep map monitoring and enthusiast inspection as secondary paths.
- **Suggested command:** `$impeccable shape homepage`

**[P1] The first viewport is overloaded with chrome**

- **Why it matters:** The header, `TransportationSystemBar`, disruption banner, map controls, telemetry footer, and bottom navigation all compete before the user has chosen a task.
- **Fix:** Collapse the system bar into one compact Services control, keep one primary action, and move route/service detail into contextual drawers.
- **Suggested command:** `$impeccable distill homepage`

**[P1] Live operational trust is under-specified**

- **Why it matters:** `DisruptionAlertBanner.tsx` can fall back after a fetch failure without showing stale status, last update, source, or retry. Users may treat simulated or stale information as current.
- **Fix:** Show `Updated X ago`, source/operator, stale state, retry, and a clear distinction between simulated telemetry and verified operational data.
- **Suggested command:** `$impeccable harden homepage`

**[P2] Mobile emphasizes QR over getting somewhere**

- **Why it matters:** `MobileBottomNav.tsx` gives ticketing the strongest elevated control even though journey planning is not a first-class homepage action.
- **Fix:** Reserve the center action for the user's current journey context and reduce bottom navigation to three or four task-level destinations.
- **Suggested command:** `$impeccable adapt homepage`

## Persona Red Flags

**Jordan, first-timer**

- There is no obvious first action for planning a trip or understanding the map.
- Abbreviations and domain terms such as `BRT`, `KRL`, `HSR`, `AMARI`, `Gapeka`, and `JakLingko` are not explained inline.
- Preferences and settings are icon-only in `page.tsx:170-186`, and some system-bar discovery depends on hover.
- No visible legend explains map colors, pulsing dots, hub markers, or filter versus visibility behavior.

**Riley, deliberate stress tester**

- `DisruptionAlertBanner.tsx:52-68` hides network/API failure behind fallback content with no stale-state disclosure.
- Corridor search can produce an empty result with no explicit “no results” message or recovery suggestion.
- Dismissing an alert has no undo or restore path.
- Drawer, check-in, and selected-map context recovery after refresh or interruption is not communicated.

**Casey, distracted mobile user**

- Important service and alert controls remain at the top while the bottom navigation lacks a route-start action.
- The center QR action receives disproportionate emphasis over the likely commuter task.
- The client-only map, tiles, simulation, markers, and animated overlays have no obvious slow-network or offline state.
- Five bottom actions plus top system controls create high scan cost on a one-handed screen.

## Minor Observations

- Pervasive `text-[9px]` to `text-[11px]` labels will be difficult to scan on mobile.
- `select-none` on the entire main surface prevents normal text selection for route and service information.
- Reduced-motion CSS disables some custom animations, but Framer Motion, `animate-pulse`, `animate-ping`, and radar motion are separate paths.
- The clear-modes action appears to use the generic translation key `t.common.filter`, which risks an ambiguous label.
- Icon-only settings/preferences buttons rely on `title`, which is weak on touch devices.

## Questions to Consider

- If a commuter opens PlatformI with thirty seconds to spare, what is the one click you want them to make?
- Is QR ticketing truly the homepage's most important action, or merely the most visually dramatic one?
- What operational information can be removed from the first viewport without reducing intelligence?
- Can users trust “live” status when freshness, source, and simulation boundaries are invisible?
