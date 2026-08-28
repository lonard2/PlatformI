---
target: vehicle detail sheet (pop-up/modal)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-28T09-32-03Z
slug: src-components-inspector-vehicledetailsheet-tsx
---
# Critique: VehicleDetailSheet (vehicle pop-up/modal)

**Score: 24/40 — Acceptable** | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Live speed/ETA present; no "live" indicator (Hub has one). |
| 2 | Match System / Real World | 3/4 | Authentic vocabulary; raw enum leakage ("FIXED_FARE"). |
| 3 | User Control and Freedom | 2/4 | No Escape, no focus return; close unmounts before exit animation. |
| 4 | Consistency and Standards | 2/4 | No dialog semantics, no tablist roles; drift vs HubDetailSheet. |
| 5 | Error Prevention | 3/4 | Read-only; conditional field hiding degrades gracefully. |
| 6 | Recognition Rather Than Recall | 3/4 | Next stop + ETA pinned; heading needs mental translation. |
| 7 | Flexibility and Efficiency | 2/4 | Zero interactive controls in body. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Dense but disciplined; Overview tips into clutter. |
| 9 | Error Recovery | 2/4 | No fallback when nextStop missing. |
| 10 | Help and Documentation | 1/4 | Nothing explains crowd levels, Run vs Trainset, spotter credit. |

## Priority Issues
- [P0] Modal accessibility absent: no role=dialog/aria-modal, no focus trap/return, no Escape, 32px close button, no focus-visible rings.
- [P0] Detail sheet with no actions: no Track on Map CTA, no check-in entry; flow dead-ends.
- [P1] Overview tab is a dumping ground: 8 chunks mixing commuter answer with enthusiast reading; 4/8 cognitive-load fails.
- [P1] Dead exit animation: `if (!vehicle) return null` unmounts before AnimatePresence exit plays.
- [P2] i18n/typing fragmentation: hardcoded Indonesian, `t: any` helpers, stitched tab label.

## Detector
Exit 2, 3 findings, all border-accent-on-rounded — false positives (standard tab underline indicators). Manual verification confirmed missing dialog semantics independently; backdrop div has onClick but is not keyboard-reachable.

## Personas
- Sam: tabs announce as unrelated buttons; no focus trap; Escape does nothing; AC state via text color alone.
- Casey: 85vh sheet + backdrop hides the tapped vehicle on mobile; boarding decision buried at text-xs; ETA raw seconds.
- Alex: no affordances (no jump-to-carriages, no copy code, no trace line); enum leakage.

## Strengths
- Domain density no template has (coachbuilder/chassis, formation, depot branching).
- Disciplined state color (crowd badge is the only full-color card).
- Responsive structure matches DESIGN.md (mobile drag-dismiss, desktop 480px dock).

## Minor
- 6 unused imports; no safe-area-pb on mobile sheet; shell drift vs Hub (480/520px, /95/98, tab bold); 14x text-[10px] at floor.
