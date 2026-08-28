---
target: vehicle detail sheet (pop-up/modal)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-28T10-21-26Z
slug: src-components-inspector-vehicledetailsheet-tsx
---
# Re-Critique: VehicleDetailSheet (vehicle pop-up/modal)

**Score: 30/40 — Good** (was 24/40, +6) | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | No liveness cue (Hub has pulse dot). |
| 2 | Match System / Real World | 4/4 | Authentic vocabulary, fully i18n'd. |
| 3 | User Control and Freedom | 3/4 | All exits work; drag also on docked desktop panel. |
| 4 | Consistency and Standards | 3/4 | Shell pixel-consistent with Hub; Users icon double duty. |
| 5 | Error Prevention | 3/4 | Read-only; nothing misfires. |
| 6 | Recognition Rather Than Recall | 4/4 | Header persists; roving tablist. |
| 7 | Flexibility and Efficiency | 3/4 | Arrow-key tabs; no crowd-to-seating shortcut. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Dense but disciplined. |
| 9 | Error Recovery | 2/4 | Silent data gaps (line/nextStop/photos). |
| 10 | Help and Documentation | 2/4 | Spotter credit only. |

Cognitive load: 8/8 PASS (was 4/8). All previous P0/P1/P2 defects verified fixed: dialog semantics complete, tablist ARIA complete, 0 unused imports, 0 ': any', 0 hardcoded strings, 0 sub-10px text, reduced-motion handled.

## Remaining Issues
- [P1] Numeric jitter: speed/ETA lack tabular-nums (utility exists).
- [P1] Icon-only check-in on mobile (Users glyph, same as crowd card).
- [P2] Drag-dismiss active on docked desktop panel; drag-vs-scroll gesture ambiguity on mobile.
- [P2] No liveness indicator on the app's most live surface.
- [P3] Silent data gaps (no empty states for line/nextStop/gallery).
- [P3] Glass /98 near-opaque, system-wide soft-violation of Map Remains Open.

## Detector
Exit 2, 3 findings, all border-accent-on-rounded on tabs — false positives (tab underline indicators).

## Strengths
- Domain authenticity as design (coachbuilder/depot/formation depth).
- Most accessibility-rigged surface in the app; house standard for Hub to inherit.
- Disciplined shared shell with HubDetailSheet.

## Personas
- Sam: setTimeout focus timing; no tab-panel live announcements; otherwise excellent.
- Casey: crowd card below fold in 46vh; icon-only check-in; drag/scroll gesture ambiguity.
- Alex: View on Map closes inspector (no keep-open tracking); tab state resets per open.
