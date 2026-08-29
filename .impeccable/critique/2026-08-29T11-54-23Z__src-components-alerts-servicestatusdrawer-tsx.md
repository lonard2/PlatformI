---
target: status & network information sheet
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-29T11-54-23Z
slug: src-components-alerts-servicestatusdrawer-tsx
---
# Re-Critique: ServiceStatusDrawer (status & network information sheet)

**Score: 31/40 — Good** (was 23/40, +8) | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4/4 | Exemplary telemetry. |
| 2 | Match System / Real World | 3/4 | 7-day tooltips leak raw enums; "% normal" pill ambiguous. |
| 3 | User Control and Freedom | 3/4 | Language menu no Escape/aria-expanded. |
| 4 | Consistency and Standards | 3/4 | Matches VehicleDetailSheet grammar; opaque bg vs sibling glass. |
| 5 | Error Prevention | 3/4 | "Today" hardcodes 2026-08-22. |
| 6 | Recognition Rather Than Recall | 4/4 | Counts, badges, band note, labeled bars. |
| 7 | Flexibility and Efficiency | 3/4 | No severity sort. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Disciplined; stale badge duplicated. |
| 9 | Recognize/Recover from Errors | 3/4 | Stale banner lacks live region. |
| 10 | Help and Documentation | 2/4 | Uptime/OTP/MTTR semantics unexplained. |

Cognitive load: 6 pass / 1 partial / 0 fail. Detector: 3 findings, all false positives (tab underlines). All prior P1-P3 fixes verified landed by independent source check.

## Priority Issues
- [P1] Severity chip counts count alerts, list filters lines; counts ignore category/search.
- [P1] UPTIME OTP ignores the timeframe selector (unconditional sum).
- [P1] LIVE list never severity-sorted.
- [P2] 7-day tiles color-only, enum tooltips; calendar cells bare-number names; "Today" hardcoded date; wrong empty-state copy; hero squeeze <=320px; touch-target gaps (6 groups + calendar cells); uptime panel aria-controls; language menu Escape; dead imports.
- [P3] Footer left slot redundant; tab badge frozen at 30-day; truncated trend labels; unweighted averages.

## Specificity
Authored, one generic pocket (UPTIME hero). HISTORY post-mortems are the authored high point.

## Personas
- Alex: OTP frozen across timeframes; chip counts untrustworthy; no severity sort.
- Sam: nameless color-only 7-day tiles; bare-number calendar cells; silent stale banner; language menu.
- Casey: chip rows without scroll affordance; hero squeeze at 320px; 12-bar chart legibility.

## Strengths
- HISTORY post-mortem architecture = institutional memory.
- Interaction grammar identical to VehicleDetailSheet.
- Honest chart mechanics: band note, target-crossing encoding, no-data stubs.
