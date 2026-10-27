# Multi-region support

PlatformI serves one active service region at a time. Jabodetabek
(`reg-jabodetabek-01`) is the default; six more populous metros ship as
empty, authorable regions grouped under Indonesia in the region picker.

## How it works

- `useRegionStore` (`src/lib/stores/useRegionStore.ts`) holds `activeRegionId`,
  persisted to localStorage, defaulting to Jabodetabek.
- `linesInRegion` / `stopsInRegion` / `useActiveLines` / `useActiveStops` /
  `useActiveVehicles` scope every map layer, the journey planner, the network
  studio, and the fleet + alerts boards to the active region.
- Switching regions recenters the map on the region center, clears the
  selected stop/line and any planned journey (a Jakarta pin must never
  survive a switch to Surabaya), and closes the transport-bar tray.
- The transport bar catalog is legacy Jakarta data: items without
  `regionIds` read as Jabodetabek-only and hide elsewhere, with an honest
  empty-region note. Tag an item with `regionIds` when its corridors go live
  in another region.
- New metros start with zero lines. Author them from Network Studio (the
  studio board, map, line assigner, and new-line defaults all follow the
  active region); `wilayah` codes remain the within-Javametro subdivision,
  independent of regions.

## Adding a region

1. Add the record (id, code, name, `countryCode: "ID"`, center, zoom,
   boundary polygon) to `METRO_REGIONS` in `src/lib/data/jakarta-dataset.ts`
   and to `prisma/seed.ts`; backfill `dev.db` with an INSERT.
2. Never invent lines or stops for it — Surabaya shows an empty board until
   OCC authors real corridors.
3. Regions with lines cannot be deleted without `force=true`, which cascades
   lines, stops, vehicles, and timetable runs.
