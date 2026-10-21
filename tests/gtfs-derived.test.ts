/**
 * PlatformI - Derived GTFS artifact tests.
 *
 * Validates the committed gtfs-derived.json: schema integrity, stop-id join
 * against the dataset, route spot-checks, and report-only drift behavior.
 */

import { describe, expect, it } from "vitest";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import {
  getGtfsLineSchedule,
  getSegmentSeconds,
  reportScheduleDrift,
  validateDerivedArtifact,
} from "@/lib/services/gtfsSchedule";

const BUS_LINE_IDS = TRANSIT_LINES.filter((l) =>
  /^line-tj-(cor|sub|feeder|royal|wisata|mikro)-/.test(l.id)
).map((l) => l.id);

describe("gtfs derived artifact", () => {
  it("covers every in-scope bus line", () => {
    expect(BUS_LINE_IDS.length).toBe(41);
    for (const id of BUS_LINE_IDS) {
      expect(getGtfsLineSchedule(id), id).toBeDefined();
    }
  });

  it("returns undefined for rail lines (explicit fallback contract)", () => {
    expect(getGtfsLineSchedule("line-krl-bogor")).toBeUndefined();
    expect(getSegmentSeconds("line-krl-bogor", "A", "B")).toBeUndefined();
  });

  it("passes structural validation", () => {
    expect(validateDerivedArtifact()).toEqual([]);
  });

  it("joins 100% of canonical stop ids to dataset stop codes", () => {
    const codes = new Set(TRANSIT_STOPS.map((s) => s.code));
    for (const id of BUS_LINE_IDS) {
      const schedule = getGtfsLineSchedule(id);
      if (!schedule) continue;
      for (const dir of schedule.directions) {
        for (const stopId of dir.stopIds) {
          expect(codes.has(stopId), `${id}: ${stopId}`).toBe(true);
        }
      }
    }
  });

  it("spot-checks corridor, feeder, and mikrotrans routes", () => {
    const cor1 = getGtfsLineSchedule("line-tj-cor-1");
    expect(cor1?.directions[0].firstTripWeekday).toBe("05:00");
    expect(cor1?.tripCount).toBeGreaterThan(0);

    const feeder = getGtfsLineSchedule("line-tj-feeder-1a");
    expect(feeder?.directions[0].firstTripWeekday).toBe("05:00");

    const bw1 = getGtfsLineSchedule("line-tj-wisata-bw1");
    expect(bw1?.directions[0].firstTripWeekday).toBe("10:00");

    for (const id of BUS_LINE_IDS) {
      const schedule = getGtfsLineSchedule(id);
      for (const dir of schedule?.directions ?? []) {
        for (const seg of dir.segmentSeconds) {
          expect(seg).toBeGreaterThan(0);
          expect(seg).toBeLessThanOrEqual(3600);
        }
      }
    }
  });

  it("sums segment medians along a direction", () => {
    const schedule = getGtfsLineSchedule("line-tj-cor-1");
    const dir = schedule?.directions[0];
    if (!dir || dir.stopIds.length < 3) return;
    const total = getSegmentSeconds("line-tj-cor-1", dir.stopIds[0], dir.stopIds[2]);
    expect(total).toBe(dir.segmentSeconds[0] + dir.segmentSeconds[1]);
    expect(
      getSegmentSeconds("line-tj-cor-1", dir.stopIds[2], dir.stopIds[0])
    ).toBeUndefined();
  });

  it("reports drift without touching hand-authored values", () => {
    const drifts = reportScheduleDrift();
    const cor1Headway = drifts.find(
      (d) => d.lineId === "line-tj-cor-1" && d.field === "headwayMinutes"
    );
    expect(cor1Headway).toBeDefined();
    expect(cor1Headway?.handAuthored).toBe("3");
    const line = TRANSIT_LINES.find((l) => l.id === "line-tj-cor-1");
    expect(line?.headwayMinutes).toBe(3);
  });
});
