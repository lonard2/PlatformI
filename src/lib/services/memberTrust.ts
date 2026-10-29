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
