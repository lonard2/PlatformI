---
target: homepage cockpit incl TSB + top chrome
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/lonard/Desktop/PlatformI/src-app-page-tsx"
timestamp: 2026-09-06T05-02-02Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage cockpit (post journey-binding + 6th-slot + tray-a11y + P2 cycle)

**Score: 30/40 — flat, composition transformed** (P0 capability closed; regressions opened in the new UI) | Detector: 0 | P0: 0, P1: 2

## Baseline verification
CONFIRMED FIXED: journey-to-map binding (pins/pulse/beacon/glow/fitBounds, correct teardown), AI demoted to refinement, mobile 6th AI slot live-synced, tray aria-expanded/controls/region, status phrases keyed x6 with type enforcement, severity rollup header+badge, banner reset on new criticals, opener semantics, page.tsx motion gating, corridor search label, tray Escape, nav active-state.
PARTIAL: TSB framer 4 ungated + whileHover/whileTap; dead imports (SupportedLanguage, MapPin); dual modal control path multi-site; TSB settings opener aria; rollup duplicated 2 files; key={idx} x1.

## Priority Issues
- [P1] R1 mid-typing plotting: substring matcher, camera thrash per keystroke, result card omits resolved stop names. Fix: debounce 300ms, exact/datalist-match resolution, echo origin->destination as card heading.
- [P1] R2 320px AI-slot clip (340px minimum > 320px viewport). Fix: narrower min-widths or overflow scroll.
- [P2] R3 journey UI re-imported hardcoded English (DIRECT ROUTE, Map Plotted, Select valid stations, Clear/Swap labels, MapControls x4).
- [P2] R4 journey panel + crowdsource/tickets drawers skip house dialog grammar (no Escape, no role=dialog); banner expand is div onClick.
- [P3] Journey state not deep-linkable; tile-switcher no outside-click; "23 All Active" awkward; viewOnMap as tab name; attribution disabled.

## Strengths
- The map answers: pins bloom, candidates glow, camera flies, teardown correct.
- Operational honesty systemic: one highestSeverity rollup drives header/nav/banner.
- VehicleDetailSheet remains gold-standard house grammar.

## Ceiling
Peak lands on the map; end is a stat block. Post-plot card needs legs/boarding points/origin departures to close the loop for a commuter physically standing at a platform.
