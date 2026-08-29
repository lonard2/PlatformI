---
target: crowdsource surface
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-29T12-31-52Z
slug: src-components-crowdsource
---
# Critique: Crowdsource surface (CheckInModal + CommunityLiveFeed)

**Score: 24/40 — Acceptable** | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Failed submits leave optimistic state; feed timestamps only update on 30s refetch. |
| 2 | Match System / Real World | 3/4 | "Crush Load" speaks commuter; fabricated USR-XXXXX and un-rolled-back data are fiction. |
| 3 | User Control and Freedom | 2/4 | No undo; backdrop tap destroys typed note. |
| 4 | Consistency and Standards | 2/4 | No focus trap, no reduced-motion, flat cyan vs gradient, no 44px targets. |
| 5 | Error Prevention | 2/4 | Cooldown resets on close/reopen; defaults invite lazy answers. |
| 6 | Recognition Rather Than Recall | 3/4 | Density cards strong; vehicle select is pure recall. |
| 7 | Flexibility and Efficiency | 2/4 | One path; no preset; no repeat shortcut. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Tight; 6 accent hues strains Signal Rarity. |
| 9 | Recognize/Recover from Errors | 2/4 | Correct rose alert; no role=alert, no retry. |
| 10 | Help and Documentation | 2/4 | Sublabels educate; decay told but never shown. |

Cognitive load: PASS conditionally (2 taps from vehicle context; FAIL cold-open). Detector: 2 findings, both false positives.

## Priority Issues
- [P0] Contribution payoff missing in feed: no entrance animation, no You marker, no aria-live, no new-count pill.
- [P0] Dialog standard gap: no focus trap, no reduced-motion, no focus-visible, no aria-pressed/radiogroup, no role=alert.
- [P1] Optimistic rollback absent: failed check-in leaves wrong crowd level on map.
- [P1] Cooldown cosmetic: state unmounts on close, resets timer.
- [P2] Defaults pre-fill unasserted data (LEVEL_2/OPTIMAL).

## Specificity
~70% authored (density ladder, mono codes, route colors), 30% category skin (form skeleton, generic ticker).

## Personas
- Alex: flat vehicle list; no platform-sweep shortcut.
- Jordan: promise-vs-delivery gap; trust model unanswered.
- Sam: Tab escapes; buttons announce as plain; banners silent; feed rows keyboard-inaccessible.
- Casey: centered modal vs bottom-sheet; 10px sublabels; AC sublabels truncate.

## Strengths
- Density card picker: hue-laddered, sublabeled, tactile.
- Mono-telemetry discipline: codes, LIVE chip, WIB clock.
- Color semantics coherent across modal/feed/inspector.
