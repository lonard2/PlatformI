---
target: homepage cockpit incl TSB + top chrome
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/lonard/Desktop/PlatformI/src-app-page-tsx"
timestamp: 2026-09-03T13-46-10Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage cockpit incl. TransportationSystemBar + top chrome

**Score: 30/40 — Good** (31 → 30; house standard raised by 5 admin cycles, homepage trails its own house) | Detector: 3 advisories (TSB tray hexes) | P0: 1, P1: 3

## Verdict
Authored, unmistakably. Domain data is a moat (23 BRT corridors with headways, PELNI sandar, RoyalTrans tol, JAK.x codes, WIB). Exception: the dashboard-shaped composition — verbs perform in front of the map, not on it.

## Priority Issues
- [P0] Journey never touches the map: handleFindRoute opens AI chat; no pins/polyline/deterministic layer. Fix: instant map answer (pins + candidate lines) when both fields valid; AI = refinement role.
- [P1] Dead AI entry on mobile: onOpenAI prop accepted by MobileBottomNav, never rendered; header AI button hidden sm:flex.
- [P1] Tray disclosure invisible to AT: system item buttons lack aria-expanded/aria-controls.
- [P1] Mixed-language data layer: Indonesian statusReason/statusText/fareText in all locales; status phrases are UI vocabulary — key off ServiceOperatingStatus.
- [P2] No severity rollup in persistent chrome; journey ergonomics (swap, iOS datalist); dismissed banner permanently silenced; modal openers lack aria-expanded (0/5); duplicated modal control paths; Framer springs not motion-gated; mobile nav Map/Status color-only active; corridor search unlabeled; 7 dead TSB imports.
- [P3] Track-on-Map tab name; tray lacks Escape; 32px scroll arrows on touch tablets; TelemetryFooter mobile cost.

## Strengths
- Domain specificity unmatched: per-corridor headways, wisata fare semantics, honest OFF_HOURS (slate, no glow).
- Corridor tray = signature moment: search when >2 items, 45vh clamp, guaranteed map response.
- Honest-state discipline from admin cycles applied here: pulses only on degraded, fetchFailed surfaced.

## Ceiling to 35+
Binding verbs to cartography: journey results plotted on canvas, severity in persistent chrome, tray speaking user locale. Three P1s + one P0 = the entire distance.
