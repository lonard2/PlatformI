---
target: homepage top chrome (header + system bar)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-28T11-18-59Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage top chrome (shell + header + TransportationSystemBar + mobile nav)

**Score: 31/40 — Good** (was 24/40, +7) | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4/4 | System always reports; aria-pressed everywhere. |
| 2 | Match System / Real World | 4/4 | Station-board authenticity. |
| 3 | User Control and Freedom | 3/4 | Tray search + journey pill lack Escape. |
| 4 | Consistency and Standards | 3/4 | Three primary-button dialects; raised mobile-nav action never shipped. |
| 5 | Error Prevention | 4/4 | Validated Find Route; corridor no-op guard. |
| 6 | Recognition Rather Than Recall | 2/4 | Status semantics hover-only; untaught on touch. |
| 7 | Flexibility and Efficiency | 3/4 | No keyboard path to journey pill. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Five header accent treatments push Signal Rarity ceiling. |
| 9 | Recognize/Recover from Errors | 3/4 | Disabled Find Route explains nothing. |
| 10 | Help and Documentation | 2/4 | No status-color legend in chrome. |

Cognitive load: 7/8 PASS. One fail: settings has no mobile path. Detector: 4 findings (1 false positive, 3 known advisories).

## Priority Issues
- [P1] Settings unreachable on mobile (header hidden below 640px; no gear path).
- [P1] Status semantics hover-only; untaught on touch devices.
- [P2] No autocomplete on journey inputs (store has all stops; datalist is free).
- [P2] Journey arc ends in chat, not cartography (no fly-to/route hand-off).
- [P2] Three primary-button dialects (gradient spec vs flat cyan vs ghost).
- [P2] Residue: dead no-scrollbar + animate-in classes (plugin not installed), scroll-arrow hex vs --glass-chrome, timeout-on-unmount, collapse toggle aria-expanded, wallet aria-label mismatch, aria-pressed absent on drawer toggles, "HUB" literal, journey pill touch targets.
- [P3] In-flow tray can consume >40% of laptop viewport; journey pill may collide with Leaflet zoom.

## Specificity
System bar = authored moat. Footer = authored. Header/journey pill/mobile nav = interchangeable; journey pill's destination (AI) is its differentiator.

## Personas
- Alex: no autocomplete; disabled button reads as broken. Positive: A→B receipt persists.
- Jordan: half-translated data strings ("Beroperasi Normal" in every locale); untaught dot language.
- Sam: tray closes on corridor select (re-open x5 for 5 KRL lines); in-flow tray shrinks map.

## Strengths
- System bar is a product moat of real data.
- Merged tab semantics fixed the split-brain with a documented rationale.
- Layer vocabulary enforced: --glass-chrome, semantic status palettes, reduced-motion everywhere.
