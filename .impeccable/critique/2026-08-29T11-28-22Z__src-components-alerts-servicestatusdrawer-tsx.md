---
target: status & network information sheet
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-29T11-28-22Z
slug: src-components-alerts-servicestatusdrawer-tsx
---
# Critique: ServiceStatusDrawer (status & network information sheet)

**Score: 23/40 — Acceptable** | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Stale-state buried in footer. |
| 2 | Match System / Real World | 2/4 | UPTIME hero mislabels uptime as "On-time performance". |
| 3 | User Control and Freedom | 2/4 | Month paging wipes date selection silently. |
| 4 | Consistency and Standards | 2/4 | No focus trap/tablist/rings vs VehicleDetailSheet reference. |
| 5 | Error Prevention | 2/4 | Severity filters are dead logic (no UI). |
| 6 | Recognition Rather Than Recall | 3/4 | Trend values tap-only. |
| 7 | Flexibility and Efficiency | 2/4 | "Show only disrupted lines" impossible. |
| 8 | Aesthetic and Minimalist Design | 3/4 | UPTIME hero = generic SaaS drift. |
| 9 | Recognize/Recover from Errors | 2/4 | STALE chip while list shows seed data as current. |
| 10 | Help and Documentation | 2/4 | No rings, color-only encodings, reduced-motion gap. |

Cognitive load: 5/8 PASS. Detector: 3 findings, all false positives (tab underlines).

## Priority Issues
- [P1] Severity filters dead logic (severityFilter/selectedHistorySeverity render no UI; dead icon imports).
- [P1] A11y debt: no focus trap, no tablist ARIA, no focus-visible rings; month buttons title-only; trend bars nameless.
- [P1] UPTIME data integrity: uptime labeled OTP, avgOtp never shown, aggregates ignore timeframe, fabricated 98.00 fallbacks, truncated 94% baseline.
- [P2] INFO alerts render emerald NORMAL + amber detail; no cyan/info semantics.
- [P3] Hygiene: dead slate-850/py-0.2 classes, hardcoded "Headway: "/"(22 Agu)", 28px/14px touch targets, stale-state placement, reduced-motion gap.

## Specificity
B-grade authored: LIVE/HISTORY carry control-room DNA (WIB, post-mortems, operator colors); UPTIME is generic-SaaS drift.

## Personas
- Alex: no severity filter; wrong cross-timeframe aggregates; tap-per-bar trend.
- Sam: nameless tabs and bars; color-only tiles; no rings.
- Riley: offline shows seed as current; fetch race on month-paging; raw monthKey tooltip; menu+backdrop double-close.

## Strengths
- HISTORY tab is the authored high point (calendar + post-mortems).
- Honest data plumbing (real fetch, graceful fallback, WIB clock).
- Disciplined severity semantics on LIVE matching DESIGN.md and banner.
