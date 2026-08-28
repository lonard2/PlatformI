---
target: homepage top chrome (header + system bar)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-28T10-38-37Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage top chrome (page shell + header + TransportationSystemBar + mobile nav)

**Score: 24/40 — Acceptable** (was 19/40, +5) | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | DISRUPTED renders gray not rose; hover card hardcoded emerald; statusReason hover-only. |
| 2 | Match System / Real World | 4/4 | Operator colors, corridor codes, headways — genuine excellence. |
| 3 | User Control and Freedom | 3/4 | All exits work; no Escape on language menu, no undo for clear-all. |
| 4 | Consistency and Standards | 2/4 | Filter-tab vs map-toggle identity collision; "Filter" action clears; untranslated tooltips. |
| 5 | Error Prevention | 2/4 | Enabled Find Route button yields "Coming Soon" — false affordance. |
| 6 | Recognition Rather Than Recall | 3/4 | Context on screen; hover card mouse-only. |
| 7 | Flexibility and Efficiency | 3/4 | Corridor search, bulk toggles, scroll arrows; no global collapse. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Universal pulses, 4 hand-rolled glass surfaces, borders on borders. |
| 9 | Error Recovery | 2/4 | Good empty state; silent no-op corridor clicks. |
| 10 | Help and Documentation | 2/4 | Dense instrument, no orientation; tooltips untranslated. |

Cognitive load: 3/8 PASS (uniform density failure). Detector: 1 finding (false positive — slate-950 on cyan-500 is high contrast).

## Priority Issues
- [P0] "Find Route" false affordance (page.tsx:211-221): enables on input, toasts Coming Soon, dies. Wire to AI advisor or disable upfront with label.
- [P0] Filter-tab / map-toggle identity collision (TSB:866-900 vs 1003-1025): same labels, different semantics, 40px apart. Merge semantics or visually split.
- [P1] Silent no-op corridor cards (TSB:817-831): feeders without lineId/stopId/coordinates (1B, 1C, 1E...) do nothing on click.
- [P1] Status color semantics: DISRUPTED gray not rose (TSB:1104-1108); hover card always emerald (TSB:1199-1201).
- [P2] A11y floor: no focus-visible rings; collapse toggle title-only (TSB:1028); language menu lacks aria-expanded/Escape; 22-32px touch targets; 2 Indonesian title tooltips bypass i18n (TSB:1005, 1030).
- [P2] Mislabelled clear action (t.common.filter on clearAllModes); duplicate "All Modes"; dead xs breakpoint label; dead classes slate-850/h-13.

## Specificity
System bar = signature surface (strongly authored). Telemetry footer = authored. Header, journey pill, mobile nav = category-interchangeable.

## Personas
- Jordan: Rel filter vs Rel toggle; "Filter" clears; Find Route dead end.
- Sam: no focus rings; title-only statuses; menu a11y; 32px pills.
- Alex: no overflow indication on scroll arrows; no global collapse; xs label never renders.
- Casey: 10px language switcher; thumb-hostile pill targets.

## Strengths
- System bar is a real product artifact (~200 authentic routes).
- Progressive-disclosure ladder (pill > hover card > tray > search > corridors).
- Shell cohesion (bar + mobile nav backgrounds; motion infra exists).
