/**
 * PlatformI - Member trust incentives.
 *
 * Verified members count more in crowdsource aggregation (capped, never
 * immune to flags) and cool down faster. Guests and unverified members
 * always count at unity. Phase 2's flag rules consume the weight; they
 * treat every report the same regardless of who filed it.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing.
 */

export const VERIFIED_WEIGHT_MULTIPLIER = 2;
export const STANDARD_COOLDOWN_SECONDS = 60;
export const VERIFIED_COOLDOWN_SECONDS = 30;

/** Distinct-member flags that trigger quiet down-weight (report stays visible). */
export const FLAG_THRESHOLD_COUNT = 2;
/** Aggregation multiplier once the flag threshold is reached. */
export const FLAG_DOWNWEIGHT_FACTOR = 0.25;
/** Flags per member per rolling window (anti-brigading). */
export const FLAG_RATE_LIMIT_COUNT = 10;
export const FLAG_RATE_LIMIT_WINDOW_SECONDS = 300;

export interface ReporterIdentity {
  id: string;
  role: string;
  verifiedAt: string | Date | null;
}

function isVerified(reporter: ReporterIdentity | null | undefined): boolean {
  return !!reporter && reporter.verifiedAt !== null && reporter.verifiedAt !== undefined;
}

/** Aggregation weight for a reporter. Guests and unverified members count 1. */
export function reporterWeightFor(reporter: ReporterIdentity | null | undefined): number {
  return isVerified(reporter) ? VERIFIED_WEIGHT_MULTIPLIER : 1;
}

/** Cooldown window in seconds for a reporter. Verified members wait less. */
export function cooldownSecondsFor(reporter: ReporterIdentity | null | undefined): number {
  return isVerified(reporter) ? VERIFIED_COOLDOWN_SECONDS : STANDARD_COOLDOWN_SECONDS;
}

/**
 * Effective aggregation weight for a stored report. Flagged reports stay
 * visible but count less; verified reporters get no immunity from flags.
 */
export function effectiveReportWeight(baseWeight: number, flagCount: number): number {
  if (flagCount >= FLAG_THRESHOLD_COUNT) return baseWeight * FLAG_DOWNWEIGHT_FACTOR;
  return baseWeight;
}
