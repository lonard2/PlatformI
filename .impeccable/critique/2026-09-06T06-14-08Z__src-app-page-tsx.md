---
target: homepage cockpit incl TSB + top chrome
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/lonard/Desktop/PlatformI/src-app-page-tsx"
timestamp: 2026-09-06T06-14-08Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage cockpit (post regression-patch cycle)

**Score: 32/40 — Good** (26 -> 32) | Detector: 0 | Baseline: 9/9 FIXED (1 partial) | P0: 0, P1: 1

## Baseline verification
CONFIRMED FIXED: banner restructure (0 nested buttons, hydration-safe); journey focus onAnimationComplete + pill-restore flag; journeyNoMatch x6 with {field}; short tab keys x6 + AI slot labeled; MapControls z-30; basemap full menu grammar (Escape/outside/aria-expanded/menuitemradio); undo-strip alertDismissed key; refine prompt x6; banner framer gated; dead imports gone; TSB settings toggle.
PARTIAL: drawer focus lifecycle (exit-animation refocus bug: closing drawer re-focuses departing node after restore ran).

## Priority Issues
- [P1] Validation split-brain: exact-match memos drive the error UI, substring matcher drives resolution — contradictory rose border + resolved card; premature error on first keystrokes. Fix: failingField from planner outcome; error only when both filled + resolution failed.
- [P2] Transfer overpromise: badge says 1-Transfer when transferOption undefined (4 glow lines, no T beacon). Fix: badge keys off transferOption; journeyNoTransfer key x6.
- [P2] Results never announced: no aria-live on result/error slot; undo strip no role=status.
- [P2] Same-stop input dead-ends into false generic hint.
- [P2] Two dialog grammars: panel/drawers lack useDialogFocusTrap.
- [P3] Dismiss focus black hole; drawer-switch trigger capture leak; exit-refocus bug; per-keystroke replaceState; 2 English attrs; TSB layout ungated; comment rot; SYSTEM_GROUPS in component file.

## Strengths
- Journey-to-map binding finished craft: debounce -> planner -> pins/beacons/glow/fitBounds with name echoes.
- Authenticity at dataset depth: 100+ real JAK routes, operator colors, JakLingko cap.
- One focus pattern consistent across pill/panel/drawers/sheets.

## Ceiling (confirmed)
Leg-by-leg timeline; planned-route x alerts cross-highlight; absolute ETA from simulation clock; share button beside the deep-link machinery.
