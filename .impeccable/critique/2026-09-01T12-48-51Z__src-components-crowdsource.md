---
target: crowdsource surface
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-01T12-48-51Z
slug: src-components-crowdsource
---
# Re-Critique: Crowdsource surface (CheckInModal + CommunityLiveFeed + session.ts + page wiring)

**Score: 33/40 — Good** (24 → 31 → 33) | Method: dual-agent (design review + detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | LIVE dot pulses during stale; false empty state on slow load. |
| 2 | Match System / Real World | 3/4 | tapToSelect reused as vehicle placeholder. |
| 3 | User Control and Freedom | 3/4 | = |
| 4 | Consistency and Standards | 4/4 | Inspector sheet grammar mirrored. |
| 5 | Error Prevention | 3/4 | 60s limit client-side only. |
| 6 | Recognition Rather Than Recall | 4/4 | Prefill + search + line scope. |
| 7 | Flexibility and Efficiency | 3/4 | = |
| 8 | Aesthetic and Minimalist Design | 4/4 | = |
| 9 | Recognize/Recover from Errors | 3/4 | Generic error copy. |
| 10 | Help and Documentation | 3/4 | = |

Cognitive load: 7.5/8. Detector: 0 findings. Specificity: authored.

## Priority Issues
- [P1] False empty state while isLoading (feed renders "Be the first" during slow load).
- [P1] LIVE dot pulses unconditionally during stale state, contradicts amber footer.
- [P2] Spotlight loop only closes when feed already open (remount skips signal); .find() picks oldest own report.
- [P2] 60s rate limit client-side only; /api/crowdsource/checkin has no rate check.
- [P2] Vehicle select placeholder says "Tap to select level" (shared key).
- [P2] decayNote promises fade that feed rows don't perform (opacity flat with age).
- [P3] Density/AC silent defaults without vehicle context; drag-vs-scroll needs device verify; L3 orange off-spectrum; rounded-t-2xl vs inspector 3xl; spotlight visual-only for SR.

## Strengths
- No-default vehicle stance: deliberate data-integrity design.
- Per-vehicle cooldown fully coherent (recompute on switch, live countdown, explained).
- Bottom-sheet/dialog duality mirrors inspector exactly.

## Residue
- Dead useEffect import page.tsx:10.
- Feed fetch missing abort-on-unmount cleanup.
