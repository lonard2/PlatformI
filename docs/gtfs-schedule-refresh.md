# GTFS Schedule Refresh — operations note

## Source
Official TransJakarta static GTFS, fetched at generation time (never vendored):
`https://gtfs.transjakarta.co.id/files/file_gtfs.zip`

## Derivation
`scripts/derive-gtfs-schedule.py --out src/lib/data/gtfs-derived.json`
emits the committed derived artifact: per-line ordered stops, median segment
seconds, first/last trips per day-class, median headways.

## Filter rules (locked)
- Services allowlisted: `SH HK HL HM HR`. `HJ` expired Dec 2025 and `X` (a
  single junk day in Jan 2005) are always excluded.
- Only the 41 in-scope bus routes are derived (corridors, subkoridor, feeder,
  royaltrans, wisata, mikrotrans). Rail keeps flat-factor ETA.
- Zero/unknown segments are imputed with the direction median of positives.
- `exact_times=0`: GTFS times are headway templates. The app displays headway
  projections only — never exact GTFS timestamps as promised departures.

## Cadence
Re-pull quarterly (Jan / Apr / Jul / Oct): run the script, review the diff,
run the suite, commit. If route coverage drops below 41 or a canonical stop
id no longer joins the dataset, treat the diff as a GTFS shape change and
investigate before committing.

## Refresh log (newest first)

| Date (UTC) | Feed fingerprint | Lines | Verdict |
|------------|------------------|-------|---------|
| 2026-10-29T13:10:29Z | `sha256:63b4fb14…0cf64fb22` | 41 | promoted (first scheduled run; `ScheduleRefreshRun` in Postgres) |
| 2026-10-21 | (pre-provenance; backfilled `generatedAt` from artifact commit) | 41 | manual derive, no gates |

## Drift policy (report-only, never auto-overwrite)
`reportScheduleDrift()` compares GTFS medians against hand-authored
`headwayMinutes` / `firstDeparture` / `lastDeparture`. Hand-authored values
are authoritative (GTFS trip templates end mid-day and would wrongly empty
evening boards); GTFS windows feed the report, not the clipping logic.

## Licensing posture
No explicit reuse license was found in the feed or on the operator site. The
feed is published by the operator as open data in a trip-planner interchange
format at a public URL. Current posture: attribute in-app
(`scheduleAttribution`), fetch at seed time, do not redistribute the raw zip,
re-pull rather than freezing schedules. Reconfirm with legal before any
commercial launch.
