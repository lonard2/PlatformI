/**
 * PlatformI - Derived GTFS schedule lookups (bus lines only).
 *
 * Reads the committed derived artifact (median segment times, operating
 * windows, headways) produced offline by scripts/derive-gtfs-schedule.py.
 * GTFS times are headway templates (exact_times=0): this module exposes
 * them as planning inputs, never as promised exact departures.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing.
 */

import derivedArtifact from "@/lib/data/gtfs-derived.json";
import { TRANSIT_LINES } from "@/lib/data/jakarta-dataset";
import type { Line } from "@/types/transit";

export interface GtfsDirectionSchedule {
  direction: string;
  stopIds: string[];
  segmentSeconds: number[];
  firstTripWeekday: string | null;
  lastTripWeekday: string | null;
  firstTripWeekend: string | null;
  lastTripWeekend: string | null;
  tripCount: number;
}

export interface GtfsLineSchedule {
  code: string;
  gtfsRouteIds: string[];
  directions: GtfsDirectionSchedule[];
  tripCount: number;
  stopTimeRows: number;
  headwayMinutesMedian: number | null;
}

interface GtfsDerivedArtifact {
  generatedNote: string;
  feedUrl: string;
  allowedServices: string[];
  lines: Record<string, GtfsLineSchedule>;
}

const ARTIFACT: GtfsDerivedArtifact = derivedArtifact as GtfsDerivedArtifact;

/** Schedule for a dataset line id, or undefined for rail / unmapped lines. */
export function getGtfsLineSchedule(lineId: string): GtfsLineSchedule | undefined {
  return ARTIFACT.lines[lineId];
}

/**
 * Median seconds to travel from one stop code to another along the same
 * GTFS direction (sums consecutive segment medians). Returns undefined when
 * no derived direction contains both stops in order.
 */
export function getSegmentSeconds(
  lineId: string,
  fromStopCode: string,
  toStopCode: string
): number | undefined {
  const schedule = getGtfsLineSchedule(lineId);
  if (!schedule) return undefined;
  for (const dir of schedule.directions) {
    const from = dir.stopIds.indexOf(fromStopCode);
    const to = dir.stopIds.indexOf(toStopCode);
    if (from >= 0 && to > from) {
      const total = dir.segmentSeconds.slice(from, to).reduce((a, b) => a + b, 0);
      return total > 0 ? total : undefined;
    }
  }
  return undefined;
}

function isHhMm(value: string | null): boolean {
  return value !== null && /^\d{2}:\d{2}$/.test(value);
}

/** Structural validation of the committed artifact. Returns error strings (empty = valid). */
export function validateDerivedArtifact(): string[] {
  const errors: string[] = [];
  const lineIds = Object.keys(ARTIFACT.lines);
  if (lineIds.length === 0) errors.push("artifact contains no lines");
  for (const [lineId, entry] of Object.entries(ARTIFACT.lines)) {
    if (entry.directions.length === 0) errors.push(`${lineId}: no directions`);
    if (entry.tripCount <= 0) errors.push(`${lineId}: tripCount <= 0`);
    for (const dir of entry.directions) {
      if (dir.stopIds.length < 2) errors.push(`${lineId} dir ${dir.direction}: fewer than 2 stops`);
      if (dir.segmentSeconds.length !== dir.stopIds.length - 1) {
        errors.push(`${lineId} dir ${dir.direction}: segment count mismatch`);
      }
      for (const s of dir.segmentSeconds) {
        if (!(s > 0)) {
          errors.push(`${lineId} dir ${dir.direction}: non-positive segment`);
          break;
        }
      }
      for (const w of [dir.firstTripWeekday, dir.lastTripWeekday, dir.firstTripWeekend, dir.lastTripWeekend]) {
        if (w !== null && !isHhMm(w)) errors.push(`${lineId} dir ${dir.direction}: bad window value ${w}`);
      }
      if (dir.firstTripWeekday && dir.lastTripWeekday && dir.firstTripWeekday > dir.lastTripWeekday) {
        errors.push(`${lineId} dir ${dir.direction}: weekday window inverted`);
      }
    }
  }
  return errors;
}

export interface ScheduleDrift {
  lineId: string;
  field: "headwayMinutes" | "firstDeparture" | "lastDeparture";
  handAuthored: string;
  gtfsDerived: string;
}

/**
 * Report-only drift between GTFS derivation and hand-authored line values.
 * Never auto-overwrites: callers surface these for human review.
 */
export function reportScheduleDrift(lines: Line[] = TRANSIT_LINES): ScheduleDrift[] {
  const drifts: ScheduleDrift[] = [];
  for (const line of lines) {
    const schedule = getGtfsLineSchedule(line.id);
    if (!schedule) continue;
    if (schedule.headwayMinutesMedian !== null) {
      const gap = Math.abs(schedule.headwayMinutesMedian - line.headwayMinutes);
      if (gap >= 2) {
        drifts.push({
          lineId: line.id,
          field: "headwayMinutes",
          handAuthored: String(line.headwayMinutes),
          gtfsDerived: String(schedule.headwayMinutesMedian),
        });
      }
    }
    const dir0 = schedule.directions[0];
    if (dir0?.firstTripWeekday && dir0.firstTripWeekday !== line.firstDeparture) {
      drifts.push({
        lineId: line.id,
        field: "firstDeparture",
        handAuthored: line.firstDeparture,
        gtfsDerived: dir0.firstTripWeekday,
      });
    }
    if (dir0?.lastTripWeekday && dir0.lastTripWeekday !== line.lastDeparture) {
      drifts.push({
        lineId: line.id,
        field: "lastDeparture",
        handAuthored: line.lastDeparture,
        gtfsDerived: dir0.lastTripWeekday,
      });
    }
  }
  return drifts;
}
