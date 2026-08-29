---
target: crowdsource surface
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-29T12-48-45Z
slug: src-components-crowdsource
---
# Re-Critique: Crowdsource surface (CheckInModal + CommunityLiveFeed + session.ts)

**Score: 31/40 — Good** (was 24/40, +7) | Method: dual-agent (design review + deterministic detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Feed never highlights just-landed report; freshness asserted on failure. |
| 2 | Match System / Real World | 3/4 | Raw mode enum and decayNote jargon leak implementation. |
| 3 | User Control and Freedom | 2/4 | No edit/delete; mid-submit abort silent. |
| 4 | Consistency and Standards | 3/4 | Matches inspector grammar; centered modal vs bottom-sheet. |
| 5 | Error Prevention | 3/4 | Cooldown scope contradicts its own copy. |
| 6 | Recognition Rather Than Recall | 2/4 | Flat all-network dropdown without context. |
| 7 | Flexibility and Efficiency | 3/4 | Prefill + repeat-report good; no power shortcut. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Dense but disciplined; unselected colored borders dilute Signal Rarity. |
| 9 | Recognize/Recover from Errors | 3/4 | Rollback + retry; rollback race clobber risk. |
| 10 | Help and Documentation | 2/4 | Trust model asserted, not shown. |

Cognitive load: 6/8 PASS. Detector: 0 findings. All prior P0/P1 fixes verified landed.

## Priority Issues
- [P1] Hardcoded "You" chip (CommunityLiveFeed:256) breaks the 6-locale i18n contract.
- [P1] Wrong-vehicle reports structurally invited: feed opens without vehicleId; modal falls back to first vehicle.
- [P1] Anti-spam copy promises per-vehicle, code enforces session-global.
- [P1] Loop's final beat left to timing: no fetchFeed on Done, no highlight on report landing.
- [P2] Mobile modal vs bottom-sheet pattern (CheckInModal centered vs VehicleDetailSheet slide-up).
- [P2] Feed freshness asserted even on failed fetch (lastRefreshedAt updates in finally).
- [P2] Engineer-speak: decayNote jargon, raw mode enum in dropdown.

## Specificity
Half-authored: PlatformI visual language fluent; structurally a category-interchangeable widget.

## Personas
- Jordan: wrong-vehicle report risk; jargon; trust model unanswered.
- Casey: centered modal on moving bus; sublabel truncation; cross-vehicle cooldown block.
- Riley: rollback race clobber; silent abort; per-tab session identity illusion.

## Strengths
- Prefill-from-live-values: confirm-and-submit 2-second flow.
- One status language across modal/feed/inspector.
- Feed has genuine texture (line-color dots, mono codes, notes, relative timestamps).
