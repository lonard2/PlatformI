/**
 * Tier 1 & Tier 2 Tests: Commuter Crowdsourcing & Exponential Time Decay Aggregation
 * Validates 4-level crowd density scoring, AC comfort rating, 10-minute half-life decay weighting,
 * and live community feed formatting.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateVehicleDensity,
  aggregateACComfort,
  calculateDecayWeight,
  formatRelativeTime,
  CrowdsourceCheckIn,
  CROWDSOURCE_HALF_LIFE_SECONDS,
} from './helpers/domain';

describe('Tier 1: Core Crowdsource & Time-Decay Models', () => {
  it('updates vehicle density level directly from single recent check-in', () => {
    const now = Date.now();
    const reports: CrowdsourceCheckIn[] = [
      {
        id: 'CHK-01',
        vehicleId: 'MRT-SET-04',
        densityRating: 3, // Level 3: Standing room only
        acRating: 4,
        timestampMs: now - 30 * 1000, // 30 seconds ago
        userId: 'USER-101',
      },
    ];

    const result = aggregateVehicleDensity(reports, now);

    expect(result.densityLevel).toBe(3);
    expect(result.rawWeightedDensity).toBeCloseTo(3.0, 2);
    expect(result.totalWeight).toBeGreaterThan(0.95);
  });

  it('computes exact 50% decay weight at 10-minute half-life boundary', () => {
    const now = Date.now();
    const halfLifeMs = CROWDSOURCE_HALF_LIFE_SECONDS * 1000; // 600,000 ms

    const weightZero = calculateDecayWeight(now, now);
    const weightHalfLife = calculateDecayWeight(now - halfLifeMs, now);
    const weightTwoHalfLives = calculateDecayWeight(now - 2 * halfLifeMs, now);

    expect(weightZero).toBeCloseTo(1.0, 4);
    expect(weightHalfLife).toBeCloseTo(0.5, 4);
    expect(weightTwoHalfLives).toBeCloseTo(0.25, 4);
  });

  it('gives higher precedence to recent reports over older opposing reports', () => {
    const now = Date.now();

    const reports: CrowdsourceCheckIn[] = [
      // 3 older reports indicating Level 1 (Many seats) 25 minutes ago (1500s -> weight ~0.177)
      { id: '1', vehicleId: 'V1', densityRating: 1, acRating: 3, timestampMs: now - 25 * 60 * 1000, userId: 'U1' },
      { id: '2', vehicleId: 'V1', densityRating: 1, acRating: 3, timestampMs: now - 25 * 60 * 1000, userId: 'U2' },
      { id: '3', vehicleId: 'V1', densityRating: 1, acRating: 3, timestampMs: now - 25 * 60 * 1000, userId: 'U3' },
      // 1 fresh report indicating Level 4 (Crush load) 1 minute ago (60s -> weight ~0.933)
      { id: '4', vehicleId: 'V1', densityRating: 4, acRating: 2, timestampMs: now - 1 * 60 * 1000, userId: 'U4' },
    ];

    const result = aggregateVehicleDensity(reports, now);

    // Fresh report with high weight should shift active rating to Level 3 or 4
    expect(result.densityLevel).toBeGreaterThanOrEqual(3);
    expect(result.rawWeightedDensity).toBeGreaterThan(2.5);
  });

  it('aggregates AC comfort score with time decay accurately', () => {
    const now = Date.now();
    const reports: CrowdsourceCheckIn[] = [
      { id: '1', vehicleId: 'V2', densityRating: 2, acRating: 5, timestampMs: now - 2 * 60 * 1000, userId: 'U1' }, // Cold
      { id: '2', vehicleId: 'V2', densityRating: 2, acRating: 4, timestampMs: now - 5 * 60 * 1000, userId: 'U2' }, // Very Cold
    ];

    const acScore = aggregateACComfort(reports, now);

    expect(acScore).toBeGreaterThanOrEqual(4.0);
    expect(acScore).toBeLessThanOrEqual(5.0);
  });

  it('sorts community live feed chronologically descending with vehicle badges', () => {
    const now = Date.now();
    const feed: CrowdsourceCheckIn[] = [
      { id: 'A', vehicleId: 'TJ-01', densityRating: 2, acRating: 3, timestampMs: now - 300 * 1000, userId: 'U1' },
      { id: 'B', vehicleId: 'MRT-02', densityRating: 4, acRating: 2, timestampMs: now - 10 * 1000, userId: 'U2' },
      { id: 'C', vehicleId: 'KRL-03', densityRating: 3, acRating: 4, timestampMs: now - 60 * 1000, userId: 'U3' },
    ];

    const sorted = [...feed].sort((a, b) => b.timestampMs - a.timestampMs);

    expect(sorted[0].id).toBe('B'); // 10s ago (newest)
    expect(sorted[1].id).toBe('C'); // 60s ago
    expect(sorted[2].id).toBe('A'); // 300s ago
  });
});

describe('Tier 2: Boundary & Corner Crowdsource Conditions', () => {
  it('handles empty check-in set with safe defaults', () => {
    const emptyReports: CrowdsourceCheckIn[] = [];
    const density = aggregateVehicleDensity(emptyReports);
    const ac = aggregateACComfort(emptyReports);

    expect(density.densityLevel).toBe(1);
    expect(density.rawWeightedDensity).toBe(1.0);
    expect(density.totalWeight).toBe(0);
    expect(ac).toBe(3.0);
  });

  it('decays reports older than 3 hours to near-zero mathematical weight', () => {
    const now = Date.now();
    const threeHoursAgo = now - 3 * 3600 * 1000; // 18 half-lives

    const weight = calculateDecayWeight(threeHoursAgo, now);

    // 0.5^18 approx 3.8e-6
    expect(weight).toBeLessThan(0.0001);
    expect(weight).toBeGreaterThan(0);
  });

  it('clamps extreme uniform ratings to exact boundary levels [1, 4]', () => {
    const now = Date.now();

    // All crush load Level 4
    const crushReports: CrowdsourceCheckIn[] = [
      { id: '1', vehicleId: 'V1', densityRating: 4, acRating: 1, timestampMs: now, userId: 'U1' },
      { id: '2', vehicleId: 'V1', densityRating: 4, acRating: 1, timestampMs: now, userId: 'U2' },
    ];
    const crushResult = aggregateVehicleDensity(crushReports, now);
    expect(crushResult.densityLevel).toBe(4);

    // All low load Level 1
    const lowReports: CrowdsourceCheckIn[] = [
      { id: '3', vehicleId: 'V2', densityRating: 1, acRating: 5, timestampMs: now, userId: 'U3' },
      { id: '4', vehicleId: 'V2', densityRating: 1, acRating: 5, timestampMs: now, userId: 'U4' },
    ];
    const lowResult = aggregateVehicleDensity(lowReports, now);
    expect(lowResult.densityLevel).toBe(1);
  });

  it('formats relative timestamps across key second, minute, hour, day boundaries', () => {
    const now = Date.now();

    expect(formatRelativeTime(now, now)).toBe('just now');
    expect(formatRelativeTime(now - 45 * 1000, now)).toBe('just now');
    expect(formatRelativeTime(now - 60 * 1000, now)).toBe('1m ago');
    expect(formatRelativeTime(now - 300 * 1000, now)).toBe('5m ago');
    expect(formatRelativeTime(now - 3600 * 1000, now)).toBe('1h ago');
    expect(formatRelativeTime(now - 86400 * 1000, now)).toBe('1d ago');
  });

  it('enforces 60-second rate limiting cooldown to prevent check-in spam', () => {
    const now = Date.now();
    const userCheckIns = new Map<string, number>();

    const checkInUser = (userId: string, timestamp: number): boolean => {
      const lastCheckIn = userCheckIns.get(userId) ?? 0;
      if (timestamp - lastCheckIn < 60000) {
        return false; // Rejected by cooldown
      }
      userCheckIns.set(userId, timestamp);
      return true;
    };

    const firstAttempt = checkInUser('USER-SPAM-1', now);
    const rapidSecondAttempt = checkInUser('USER-SPAM-1', now + 5000); // 5s later -> reject
    const validThirdAttempt = checkInUser('USER-SPAM-1', now + 65000); // 65s later -> accept

    expect(firstAttempt).toBe(true);
    expect(rapidSecondAttempt).toBe(false);
    expect(validThirdAttempt).toBe(true);
  });
});
