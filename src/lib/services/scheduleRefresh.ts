/**
 * PlatformI - Fail-closed GTFS refresh gates.
 *
 * assessRefresh() decides whether a freshly derived artifact may replace
 * the committed one. Anything suspicious quarantines with reasons; the
 * wrapper script persists the report and never promotes on doubt.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing.
 */

import { validateDerivedArtifact } from "@/lib/services/gtfsSchedule";

/** Minimum line coverage: the 41 in-scope bus routes. Never lower this silently. */
export const MIN_COVERAGE_LINES = 41;

type ArtifactLike = NonNullable<Parameters<typeof validateDerivedArtifact>[0]>;

export type RefreshCandidate = ArtifactLike;

export interface RefreshAssessment {
  verdict: "promote" | "quarantine";
  reasons: string[];
}

export interface ArtifactLineSummary {
  headwayMinutesMedian: number | null;
  firstTripWeekday: string | null;
  lastTripWeekday: string | null;
}

export interface ArtifactDrift {
  lineId: string;
  field: "headwayMinutesMedian" | "window" | "added" | "dropped";
  before: string;
  after: string;
}

/**
 * What changed between two artifacts: added/dropped lines, headway median
 * moves, and operating-window moves. Pure data, no dataset involved.
 */
export function diffArtifacts(
  candidate: Record<string, ArtifactLineSummary>,
  current: Record<string, ArtifactLineSummary>
): ArtifactDrift[] {
  const drifts: ArtifactDrift[] = [];
  const fmt = (v: number | string | null): string =>
    v === null || v === undefined ? "—" : String(v);
  const windowOf = (s: ArtifactLineSummary): string =>
    `${fmt(s.firstTripWeekday)}–${fmt(s.lastTripWeekday)}`;
  for (const [lineId, next] of Object.entries(candidate)) {
    const prev = current[lineId];
    if (!prev) {
      drifts.push({ lineId, field: "added", before: "—", after: "present" });
      continue;
    }
    if (next.headwayMinutesMedian !== prev.headwayMinutesMedian) {
      drifts.push({
        lineId,
        field: "headwayMinutesMedian",
        before: fmt(prev.headwayMinutesMedian),
        after: fmt(next.headwayMinutesMedian),
      });
    }
    if (windowOf(next) !== windowOf(prev)) {
      drifts.push({
        lineId,
        field: "window",
        before: windowOf(prev),
        after: windowOf(next),
      });
    }
  }
  for (const lineId of Object.keys(current)) {
    if (!(lineId in candidate)) {
      drifts.push({ lineId, field: "dropped", before: "present", after: "—" });
    }
  }
  return drifts;
}

export function assessRefresh(
  candidate: RefreshCandidate,
  current: RefreshCandidate
): RefreshAssessment {
  const reasons: string[] = [];

  for (const e of validateDerivedArtifact(candidate)) {
    reasons.push(e);
  }

  const candidateIds = Object.keys(candidate.lines ?? {});
  if (candidateIds.length < MIN_COVERAGE_LINES) {
    reasons.push(
      `coverage ${candidateIds.length} lines below floor ${MIN_COVERAGE_LINES}`
    );
  }

  for (const [lineId, currentEntry] of Object.entries(current.lines ?? {})) {
    const nextEntry = candidate.lines?.[lineId] as
      | { directions?: Array<{ direction?: string }> }
      | undefined;
    if (!nextEntry) {
      reasons.push(`${lineId}: line missing from candidate`);
      continue;
    }
    const currentDirs = new Set(
      (currentEntry.directions ?? []).map((d) => d.direction)
    );
    const nextDirs = new Set(
      (nextEntry.directions ?? []).map((d) => d.direction)
    );
    for (const dir of currentDirs) {
      if (!nextDirs.has(dir)) {
        reasons.push(`${lineId}: direction ${dir} dropped from candidate`);
      }
    }
  }

  return reasons.length === 0
    ? { verdict: "promote", reasons: [] }
    : { verdict: "quarantine", reasons };
}
