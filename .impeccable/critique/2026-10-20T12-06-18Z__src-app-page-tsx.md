---
target: homepage cockpit incl TSB + top chrome
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/lonard/Desktop/PlatformI/src/app/page.tsx"
target_fingerprint: "sha256:09ca1d6cd040c04160b962e3b34a2432c5b45ff367c41d033ae35244505d00c1"
target_path: /Users/lonard/Desktop/PlatformI/src/app/page.tsx
timestamp: 2026-10-20T12-06-18Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage Cockpit (cycle 10 — after the cycle 9 action plan)

**Score: 28/40 — Good** (26 -> 28, assessed before this cycle's closing fixes) | Detector: 0 findings (was 8) | Cognitive load 4/8 PASS | P0: 1, P1: 2

Method: dual-agent (A design-director re-review + regression probe, B deterministic detector and evidence). Source-only; browser automation unavailable.

## Design Health Score (Nielsen rubric)

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 3 | Live telemetry and an honest route card; the map's own controls were clipped off phones (fixed in 03cb466). |
| 2 | Match System / Real World | 3 | Authentic Indonesian transit vocabulary; the chip/eye split still asks the passenger to hold two models, and the corridor catalogue stays Indonesian-only. |
| 3 | User Control and Freedom | 3 | Undo, swap, clear, per-sector eye, Reset Map; the chip filter has no reset and Reset Map is desktop-only. |
| 4 | Consistency and Standards | 3 | Menu, tablist, radiogroup, aria-pressed discipline, zero key drift across six locales. |
| 5 | Error Prevention | 4 | The truth contract forbids an ETA, fare, pin, or camera when no route exists. Nothing over-promises. |
| 6 | Recognition Rather Than Recall | 3 | Known-stop suggestions, named markers, hover previews; 61 lines advertised, 15 routable. |
| 7 | Flexibility and Efficiency | 2 | Deep links and keyboard menus; no passenger shortcuts, no map-pick origin, multi-leg planning routes through a chat. |
| 8 | Aesthetic and Minimalist Design | 3 | Tokenised dark cockpit with real depth; the 10px coverage caveat sits above the answer it qualifies. |
| 9 | Error Recovery | 2 | Messages name the problem; the no-route state had no control (fixed in b3a7234) and the desktop AI button opened a blank chat (fixed too). |
| 10 | Help and Documentation | 2 | Hover cards and the coverage line disclose scope; no map legend, no explanation of the chip/eye split. |
| **Total** | | **28/40** | **Good — truthfulness programme landed, recovery and mobile ergonomics still weak** |

## Cognitive Load Checklist (canonical 8-item)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Single focus | FAIL | Phone chrome carries the system bar, disruption strip, planner, map HUD, telemetry footer, and a six-slot nav at once. |
| 2 | Chunking | PASS | Bar chunks by sector, tray chunks corridors, planner chunks fields -> coverage -> answer -> refine. |
| 3 | Grouping | PASS | Metrics in one bordered grid, the answer in one card, sector controls in one pill. |
| 4 | Hierarchy | FAIL | The primary answer is 12px in a 384px panel while the system bar wins on salience with saturated brand colour; the map is the smallest thing on the phone. |
| 5 | One thing at a time | FAIL | The planner panel, drawers, and the vehicle sheet are independent states and can overlap. |
| 6 | <=4 choices | FAIL | Bottom nav 6, chip row 5, system bar ~30 controls, settings modal 4+4+6+2+6. |
| 7 | Working memory | FAIL | Transfer cards carry no walk distance or transfer time; the chip/eye split needs two models. |
| 8 | Progressive disclosure | PASS | Tray, hover card, collapsed planner pill, sheet tabs, expandable alert. |

## Baseline verification (cycle 9 items)
FIXED: route truth contract (single predicate shared by panel, pill, and map) · persisted accessibility store with MotionConfig, data-motion, data-contrast · light theme and audio fiction removed · coverage line and map-only corridor labels · no corridor-to-wrong-line fallback · sector filter split with an explicit eye and a Reset Map that restores sectors and modes · locale rehydrate, font fallbacks, locale fares, reduced-transparency glass · hardcoded English, dead animation classes, labelled APG menu, named markers, sheet spring, glyph parity, arrow encoding, dead keys removed.
PARTIAL: 44px targets missed the journey inputs, the CTA, the tablet header, and the settings controls (closed in 6c6fa07) · reduced motion ignored the cartography (closed in 03cb466) · settings heading and inert model picker (closed in 26fcc88).

## Priority Issues
- [P0] The map forced a 500px floor inside an overflow-hidden row, clipping the speed and zoom controls off phones; the new bottom-nav reservation made it worse. FIXED in 03cb466 (map fills the row, Leaflet is told on resize).
- [P1] The no-route state told the truth and abandoned the passenger; the desktop AI button opened an empty chat without journey context. FIXED in b3a7234 (a real button plus one shared AI entry point).
- [P1] The 44px rule covered chrome and skipped the two fields a commuter touches every morning. FIXED in 6c6fa07.
- [P1] The cockpit discloses everything and offers little: no departure board, no walk time on transfers, no share control, no map legend. Still open; needs the boarding plan.
- [P2] Settings fiction and ARIA gaps: "Accessibility & Sound" heading, an inert default-model picker, a modal without a focus trap, four colour-only selection groups. FIXED in 26fcc88.
- [P2] The chip filter has no reset and Reset Map is desktop-only; the coverage caveat outranks the answer it qualifies; the system bar still wins salience over the answer.
- [P3] Map tooltips print the raw station-type enum; the corridor catalogue bypasses i18n; journey pins are focusable but inert; duplicated focus-trap code in the two drawers.

## Strengths
- The truth contract is architectural, not cosmetic: one predicate consumed by panel, pill, and map.
- The accessibility switches are real, persisted, and wired end to end (store -> provider -> MotionConfig -> CSS).
- Zero key drift across six locales: 924 keys in all six dictionaries, every reference resolves.

## Ceiling
The boarding plan (platform, next departure, wait, crowd band), the share control, and passenger help remain the distance to 35+. Platform and departure data need the stop coverage work that is out of scope for this pass.
