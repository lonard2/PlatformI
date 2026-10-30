# Phase 4 decisions (2026-10-30)

Evidence: `tests/phase4-modeling.test.ts` (4 passing). Nothing below builds
new behavior; each item was verified against the existing model.

## 1. Transport-bar grouping — already DB-backed, keep

`visibleGroups` in `TransportationSystemBar` derives from the `allLines`
store (Prisma-backed) plus `itemVisibleInRegion` region scoping; live
status comes from `getLiveItemStatus`, which lets ACTIVE alerts on the
item's lines override the dataset default (CRITICAL suspends, WARNING
limits). No static catalog drives the tray. Test pins the region default
(Jabodetabek legacy), scoping, and every alert-override branch.

## 2. Hub / skybridge / uptime — curated guides, explicitly not live modeling

`SKYBRIDGE_HUBS_DATA` is a curated per-hub transfer dataset (named hubs,
measured distances/durations, step-by-step guides). The guide renders only
what the dataset contains and claims no live interchange status; the only
"real-time" copy in the file names a station facility (arrival screens).
Decision: keep as curated guides. Live interchange modeling (GTFS-RT
transfers, elevator outages) is out of scope until a feed exists — no
placeholder half-model.

## 3. Cross-region — already modeled, keep

Regions are authorable (`/api/network/regions`, operator-gated since Task 1,
paginated since Task 3); every region without authored lines renders the
honest `navigation.noRegionCorridors` empty state in all six locales. New
metros start empty by rule (`docs/multi-region.md`); no invented lines.
No cut needed — the model and the explicit cut policy already agree.
