---
target: homepage cockpit incl TSB + top chrome
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
note: fresh rubric; fixes verified 9/9, regressions are collision artifacts of the R4 fix
target_identity: "file:/Users/lonard/Desktop/PlatformI/src-app-page-tsx"
timestamp: 2026-09-06T05-25-03Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage cockpit (post R1/R2/R3/R4 + deep-link cycle)

**Score: 26/40 — stricter rubric; fixes verified, R4 fix collided with itself** (30 → 26) | Detector: 0 | Baseline: 9/9 FIXED | P0: 1, P1: 2

## Baseline verification (9/9 FIXED, code-verified)
R1 debounce+echo; R2 flex-1 nav + panel cap; R3 12 journey keys x6 + MapControls (0 residual English); R4 panel role=dialog/Escape/focus-on-expand, drawers role+Escape, banner button, TSB gating, dead imports, rollup dedupe, settings toggle; deep link hydrate+replaceState guarded.

## Regressions found in the fixes
- [P0] Banner nested buttons: outer strip button contains 4 action buttons — illegal HTML, parser auto-closes outer, hydration error with active alerts, SR browse-tree loss. Fix: div container; left = aria-expanded toggle button; actions as siblings.
- [P1] Journey focus no-ops: 120ms focus fires before panel mounts under AnimatePresence mode="wait"; Escape's pill lookup runs before remount. Fix: onAnimationComplete pattern (VehicleDetailSheet:326) for animate + exit.
- [P1] No-match input silent: generic hint, no field diagnosis. journeyNoMatch x6.
- [P2] Nav labels truncate to noise at 320px ("Track on Map" in ~50px); AI slot icon-only vs DESIGN.md label rule. Short tab keys.
- [P2] MapControls z-400 over open drawers z-40.
- [P3] Basemap dropdown no Escape/outside/aria; drawer focus-in/restore half-done; undo strip copy says "Close"; AI refine prompt English; banner 2 ungated framer; 2 dead imports (AlertCircle, RotateCcw); key={idx} x2.

## Strengths
- Journey-to-map binding: debounce -> deterministic planner -> pins/beacons/glow/fitBounds with name echoes. The product's star.
- Status coherence: one severityRollup source drives header + nav + banner.
- Disciplined i18n + shareable deep links.

## Ceiling (unchanged)
Post-plot card needs legs/platform direction/origin departures — the gap between peak and end for a commuter standing at a platform.
