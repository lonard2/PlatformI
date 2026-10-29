/**
 * RED: fail-closed refresh gates — a candidate promotes only when it
 * validates clean, keeps the 41-line coverage floor, and drops no line
 * or direction the current artifact has.
 */
import { describe, it, expect } from "vitest";
import {
  assessRefresh,
  diffArtifacts,
  MIN_COVERAGE_LINES,
  type RefreshCandidate,
} from "@/lib/services/scheduleRefresh";

function dir(direction: string) {
  return {
    direction,
    stopIds: ["a", "b"],
    segmentSeconds: [60],
    firstTripWeekday: "05:00",
    lastTripWeekday: "22:00",
    firstTripWeekend: "06:00",
    lastTripWeekend: "22:00",
    tripCount: 10,
  };
}

function entry(directions: string[]) {
  return {
    code: "1",
    gtfsRouteIds: ["r"],
    directions: directions.map(dir),
    tripCount: 10,
    stopTimeRows: 10,
    headwayMinutesMedian: 5,
  };
}

function candidate(lineCount: number, dropDirsOfFirst = false): RefreshCandidate {
  const lines: Record<string, ReturnType<typeof entry>> = {};
  for (let i = 0; i < lineCount; i++) {
    lines[`line-${i}`] = entry(i === 0 && dropDirsOfFirst ? [] : ["out"]);
  }
  return {
    generatedNote: "x",
    feedUrl: "https://example.invalid/f.zip",
    allowedServices: ["SH"],
    generatedAt: "2026-10-29T00:00:00Z",
    feedFingerprint: `sha256:${"a".repeat(64)}`,
    lines,
  };
}

describe("refresh gates", () => {
  it("promotes a healthy candidate", () => {
    const current = candidate(MIN_COVERAGE_LINES);
    const next = candidate(MIN_COVERAGE_LINES);
    const result = assessRefresh(next, current);
    expect(result.verdict).toBe("promote");
    expect(result.reasons).toEqual([]);
  });

  it("quarantines below the coverage floor", () => {
    const result = assessRefresh(
      candidate(MIN_COVERAGE_LINES - 1),
      candidate(MIN_COVERAGE_LINES)
    );
    expect(result.verdict).toBe("quarantine");
    expect(result.reasons.join(" ")).toMatch(/coverage|41/i);
  });

  it("quarantines a line that loses all directions", () => {
    const result = assessRefresh(
      candidate(MIN_COVERAGE_LINES, true),
      candidate(MIN_COVERAGE_LINES)
    );
    expect(result.verdict).toBe("quarantine");
  });

  it("quarantines a candidate that fails validation", () => {
    const bad = candidate(MIN_COVERAGE_LINES) as unknown as Record<string, unknown>;
    delete (bad as { generatedAt?: string }).generatedAt;
    const result = assessRefresh(
      bad as unknown as RefreshCandidate,
      candidate(MIN_COVERAGE_LINES)
    );
    expect(result.verdict).toBe("quarantine");
  });
});

describe("artifact diff", () => {
  const summary = (headway: number | null, first = "05:00", last = "22:00") => ({
    headwayMinutesMedian: headway,
    firstTripWeekday: first,
    lastTripWeekday: last,
  });

  it("reports headway moves, window moves, adds and drops", () => {
    const drifts = diffArtifacts(
      {
        same: summary(5),
        moved: summary(9),
        "re-timed": summary(5, "06:00"),
        added: summary(5),
      },
      {
        same: summary(5),
        moved: summary(5),
        "re-timed": summary(5),
        dropped: summary(5),
      }
    );
    const fields = drifts.map((d) => `${d.lineId}:${d.field}`).sort();
    expect(fields).toEqual(
      ["added:added", "dropped:dropped", "moved:headwayMinutesMedian", "re-timed:window"].sort()
    );
  });

  it("reports nothing for identical summaries", () => {
    expect(diffArtifacts({ a: summary(5) }, { a: summary(5) })).toEqual([]);
  });
});
