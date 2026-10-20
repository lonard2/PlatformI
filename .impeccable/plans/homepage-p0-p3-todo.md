# Homepage cockpit — cycle 9 action plan (todos)

Baseline: critique 2026-10-20, 26/40. Scope per user: all P0→P3, truth + a11y first,
glow/deeper glass KEPT, coverage gated in UI (no data seeding), "cockpit" copy reworded.

Rules: minimal diff (ponytail), no emoji, no `any`, no stubs, verify before every push.

| # | Todo | Commit | Status |
|---|------|--------|--------|
| 1 | No-route truth: no "Route Plotted"/ETA/fare when no route exists; no map pins; distinct no-route card | 1c3c02f | DONE |
| 2 | Corridor click no longer falls back to an unrelated line | 3162fd2 | DONE |
| 3 | MotionConfig reducedMotion="user" + persisted a11y prefs + theme wiring | da74abd | DONE |
| 4 | Reduced-transparency fallback, CJK/Arabic font chain, lang/dir rehydrate, locale fares | 7825e8c | DONE |
| 5 | Touch targets >= 44px on 18 controls + real bottom-nav height var | c8b1867 | DONE |
| 6 | Sector filter vs map visibility separated; Reset Map restores both | 154082f | DONE |
| 7 | Reword "cockpit" across six locales, metadata, and the AI surface | bd845b1 | DONE |
| 8 | Coverage gating: routable endpoint picker + coverage line + map-only labels | 9e68b25 | DONE |
| 9 | JourneyLayer: dark-theme token fills, 11px ramp, pin accessible names | d93b419 | DONE |
| 10 | DESIGN.md: Geist typography sync + expressive-chrome allowance + touch rule | 5ad71be | DONE |
| 11 | P3 sweep: hardcoded strings, dead classes, menu a11y, sim-speed radios, marker layer, spring, glyph drift, arrows, dead keys | 648e8b2 | DONE |
| 12 | Re-critique + final push | pending | IN PROGRESS |

Verification after every commit: `npx tsc --noEmit` (clean), `npm test` (373 passing),
`impeccable detect --json` over the nine homepage files (0 findings, was 8),
`git diff --check` (clean).

Not done on purpose (ponytail / honest scoping):
- Light theme and audio chimes: the toggles were fiction, so they were removed
  rather than half-built. The app stays dark-only.
- Station type tooltips still print the raw enum: localising seven typology
  labels across six locales is a dictionary project, not a polish fix.
- The boarding plan (platform, departure, wait, crowding), the share control,
  and passenger help remain the ceiling; platform data needs the stop coverage
  work that is out of scope for this pass.
