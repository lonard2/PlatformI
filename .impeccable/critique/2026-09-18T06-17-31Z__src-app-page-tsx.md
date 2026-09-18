---
target: homepage cockpit incl TSB + top chrome
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/lonard/Desktop/PlatformI/src/app/page.tsx"
target_fingerprint: "sha256:d368cd2e83974f7e59a6ea3c8fdc9dbde6227c96c55a0231a4a68b083d27e1f5"
target_path: /Users/lonard/Desktop/PlatformI/src/app/page.tsx
timestamp: 2026-09-18T06-17-31Z
slug: src-app-page-tsx
---
# Re-Critique: Homepage Cockpit (Post Regression-Patch & Hardening Audit)

**Score: 32/40 — Good** (32 → 32) | Detector: 0 findings | Baseline: 9/9 Verified | P0: 0, P1: 1

## Baseline Verification
- **CONFIRMED MAINTAINED**: Disruption alert banner clean composition (0 nested buttons, hydration-safe); Framer Motion animations gated by `useReducedMotion()`; MapControls z-30 elevation; basemap full menu grammar (Escape/outside click/aria-expanded/menuitemradio); undo-strip alertDismissed key with 5s timeout; journey focus choreography and pill-restore flag; zero emoji compliance across all components; strict TypeScript typing.
- **DETERMINISTIC SCAN**: Clean exit code 0 (`[]` findings across `page.tsx`, `TransportationSystemBar.tsx`, `DisruptionAlertBanner.tsx`, and `MobileBottomNav.tsx`).

## Design Health Score (Nielsen 10 Heuristics)

| # | Heuristic | Score | Key Finding |
|---|-----------|:-----:|-------------|
| 1 | Visibility of System Status | 3 | Real-time telemetry feedback (live disruption pulse, moving vehicle counters, 300ms debounced journey planner). Minor mismatch: header button "14 Active Lines" opens Disruption drawer. |
| 2 | Match System / Real World | 4 | Exemplary Jakarta transit realism: authentic line codes (Ratangga MRT, LRT CB/BK, KRL B/C/R/T/TP, TJ Corridors 1-14, Mikrotrans), official operator hex colors, JakLingko Rp 10.000 fare ceiling. |
| 3 | User Control and Freedom | 3 | 5s undo toast on alert dismissal, origin/dest swap, clear button, Esc key trapping. Expanding corridor tray pushes layout in-flow rather than floating. |
| 4 | Consistency and Standards | 3 | High standard consistency across drawers, but header line counter triggers alert drawer; native `<datalist>` dropdown clashes with glassmorphic styling. |
| 5 | Error Prevention | 3 | Red borders on mismatched stops, but validation split-brain: exact-match memo drives red error border while substring matcher resolves route card! |
| 6 | Recognition Rather Than Recall | 4 | Station autocomplete hints, route color badges, explicit direct vs transfer pills, and deep link URL hydration (`?from=&to=`) eliminate memorization. |
| 7 | Flexibility and Efficiency | 3 | Sector category filters, quick reset, reverse route swap, and AI Transit Assistant handover pre-populated with transfer query parameters. |
| 8 | Aesthetic and Minimalist Design | 3 | High-density glassmorphic cockpit; high visual noise and competing screen chrome when corridor tray expands in-flow. |
| 9 | Error Recovery | 3 | Stop mismatch message clearly states problem; lacks fuzzy "Did you mean?" suggestions for colloquial station names. Alert polling failure includes visible retry action. |
| 10 | Help and Documentation | 3 | Contextual AI transit assistant with multi-model routing; operator acronyms (`CB`, `BK`, `TP`) and status dots lack quick on-screen legend. |
| **Total** | | **32/40** | **Good** |

## Design Specificity Verdict
- **LLM Assessment**: Highly specific (9.2/10). Grounded deeply in Jakarta metropolitan transit infrastructure. Custom typography tokens, JakLingko tariff ceiling rules, and operator color schemes could not belong to an interchangeable SaaS dashboard.
- **Deterministic Scan**: 0 findings from `impeccable detect`. 100% compliant with zero-emoji policy, touch target minimums, and button nesting constraints.
- **Visual Overlays**: Live browser canvas is not attached in the current environment; running deterministic static AST/regex mode.

## Cognitive Load Assessment (8-Item Checklist)
- [x] **Clear visual hierarchy (scan in 3 seconds)**: Top chrome → System Bar → Disruption Banner → Map Viewport.
- [ ] **Few choices at decision points (≤4 choices)**: FAIL. `TransportationSystemBar` exposes 16+ mode chips, 5 filter tabs, and 3 system controls simultaneously (20+ clickable elements across top 120px).
- [x] **Related items grouped logically**: Sectors partitioned into Rail, Bus, Aviation, Maritime; journey planner grouped in single floating card.
- [x] **Progressive disclosure for complex info**: Mode chips disclose headways on hover; corridor trays open on click.
- [x] **Consistent patterns across views**: Unified Framer Motion slide drawers, ESC trapping, and focus restoration.
- [ ] **Obvious next action**: PARTIAL PASS. Route planning pill tucked into top-left corner (`top-3 left-3`) while system status bar commands primary attention.
- [x] **Minimal working memory needed**: Transfer station names and JakLingko fares rendered directly on card badge; URL auto-syncs.
- [x] **Easy to resume after interruption / hand over**: Deep-link URL state hydration (`?from=...&to=...`); drawer openers restore focus upon exit.

## Priority Issues
- **[P1] Validation Split-Brain Between Inputs and Planner**:
  - *What*: `originMismatch` and `destMismatch` in `page.tsx` use strict exact-match comparison (`name.toLowerCase() === trimmed.toLowerCase()`), while `resolvePlannedJourney` in `journeyPlanner.ts` supports prefix stripping and substring matching.
  - *Why*: Typing partial stops triggers a jarring red error border while simultaneously rendering a valid resolved route card.
  - *Fix*: Derive `failingField` directly from the planner outcome; only display error borders when both fields are filled and route resolution fails.
  - *Suggested command*: `/impeccable clarify`
- **[P2] In-Flow Corridor Tray Shifts Map Viewport**:
  - *What*: Expanding a system item in `TransportationSystemBar.tsx` renders `system-tray` as an in-flow element with `max-h-[45vh]`, pushing down the map canvas.
  - *Why*: On laptop and mobile screens, expanding a corridor squishes the map canvas into an unusable sliver.
  - *Fix*: Render the expanded corridor tray as an absolute floating dropdown overlay or dock it into the drawer system.
  - *Suggested command*: `/impeccable layout`
- **[P2] Header Metric Button Label Mismatch**:
  - *What*: The top header button displays `<Activity />` with `14 Active Lines`, but clicking it opens the Disruption Alert drawer.
  - *Why*: Violates consistency and user mental models; users expect a line list or fleet filter, not an alert drawer.
  - *Fix*: Relabel button to `Network Status` or `Disruptions (${activeAlerts.length})`, or wire it to a line status view.
  - *Suggested command*: `/impeccable clarify`
- **[P2] Screen Reader Accessibility for Journey Results & Status**:
  - *What*: The journey result and error card container lacks `aria-live="polite"`, and alert undo toast lacks `role="status"`.
  - *Why*: Screen reader users receive no spoken announcement when a new route is calculated or an input validation error triggers.
  - *Fix*: Add `aria-live="polite"` and `aria-atomic="true"` to the result container, and ensure status toasts carry `role="status"`.
  - *Suggested command*: `/impeccable harden`
- **[P2] Transfer Badge Overpromise When Transfer Option Undefined**:
  - *What*: When direct lines = 0 and `transferOption` is `undefined`, the badge still says `1-Transfer` and displays Rp 10,000 fare, but the candidate lines section renders `null`.
  - *Why*: Misleads passengers into believing an active transfer route was found when no connecting line exists.
  - *Fix*: Key transfer badge and fare calculation strictly off `transferOption` presence; display explicit no-transfer notice.
  - *Suggested command*: `/impeccable clarify`
- **[P3] Mobile Bottom Navigation 6-Tab Congestion**:
  - *What*: On viewports `< 640px`, `MobileBottomNav.tsx` renders 6 buttons across the bar, compressing touch targets on small screens (<390px).
  - *Why*: Reduces target spacing and risks misclicks during mobile one-handed transit usage.
  - *Fix*: Consolidate into 4–5 primary tabs (e.g. integrate AI Advisor into Route panel or as a floating badge).
  - *Suggested command*: `/impeccable polish`

## Persona Red Flags
- **Alex (Rush-Hour Commuter)**: Journey search input is a secondary floating pill (`top-3 left-3`) rather than a prominent hero search bar; clicking "14 Active Lines" opens the disruption drawer instead of showing if their specific line is active.
- **Jordan (Dispatcher / Control Room Operator)**: No global hotkey (`/` or `Cmd+K`) to jump directly to a transit line or station; in-flow corridor tray shifts camera coordinates during active monitoring.
- **First-Time Passenger / Tourist**: Operator abbreviations (`CB`, `BK`, `TP`) lack an immediate visible legend; native `<datalist>` styling provides inconsistent visual affordance across mobile OSes.

## Minor Observations & Questions to Consider
- `DisruptionAlertBanner.tsx` polls every 30 seconds without checking `document.visibilityState`, running background network cycles when the tab is hidden.
- *Question*: What if Journey Planning was the primary bottom sheet on mobile and docked hero widget on desktop, with the Transportation System Bar functioning as a collapsible telemetry HUD?
