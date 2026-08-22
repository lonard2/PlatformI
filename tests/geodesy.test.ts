/**
 * Tier 1 & Tier 2 Tests: Spherical Geodesy & Vector Mathematics
 * Validates Haversine distance, initial azimuth bearing, cross-track error, along-track distance,
 * and polyline coordinate interpolation.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  calculateBearing,
  calculatePolylineLength,
  interpolatePositionAlongPolyline,
  crossTrackError,
  alongTrackDistance,
  calculateNextStopETA,
  EARTH_RADIUS_METERS,
} from './helpers/domain';

describe('Tier 1: Core Geodesic Mathematical Models', () => {
  it('calculates accurate Haversine distance between Bundaran HI and Monas in Central Jakarta', () => {
    const bundaranHI: [number, number] = [-6.1928, 106.8231];
    const monas: [number, number] = [-6.1754, 106.8272];

    const distanceMeters = haversineDistance(bundaranHI, monas);

    // Expected distance between Bundaran HI and Monas is approximately 1,980 - 2,050 meters
    expect(distanceMeters).toBeGreaterThan(1900);
    expect(distanceMeters).toBeLessThan(2100);
    expect(Number.isFinite(distanceMeters)).toBe(true);
  });

  it('calculates accurate Haversine distance between Lebak Bulus and Fatmawati MRT stations', () => {
    const lebakBulus: [number, number] = [-6.2892, 106.7749];
    const fatmawati: [number, number] = [-6.2925, 106.7938];

    const distanceMeters = haversineDistance(lebakBulus, fatmawati);

    // Expected distance along south Jakarta corridor is approximately 2,100 - 2,150 meters
    expect(distanceMeters).toBeGreaterThan(2000);
    expect(distanceMeters).toBeLessThan(2250);
  });

  it('calculates initial azimuth bearing correctly for all cardinal directions', () => {
    const center: [number, number] = [0, 0];
    const north: [number, number] = [1, 0];
    const east: [number, number] = [0, 1];
    const south: [number, number] = [-1, 0];
    const west: [number, number] = [0, -1];

    const bearingNorth = calculateBearing(center, north);
    const bearingEast = calculateBearing(center, east);
    const bearingSouth = calculateBearing(center, south);
    const bearingWest = calculateBearing(center, west);

    expect(bearingNorth).toBeCloseTo(0, 1);
    expect(bearingEast).toBeCloseTo(90, 1);
    expect(bearingSouth).toBeCloseTo(180, 1);
    expect(bearingWest).toBeCloseTo(270, 1);
  });

  it('calculates total cumulative length across multi-segment route polyline', () => {
    const polyline: [number, number][] = [
      [-6.2892, 106.7749], // Lebak Bulus
      [-6.2925, 106.7938], // Fatmawati
      [-6.2783, 106.7972], // Cipete Raya
      [-6.2665, 106.7974], // Haji Nawi
    ];

    const totalLength = calculatePolylineLength(polyline);
    const leg1 = haversineDistance(polyline[0], polyline[1]);
    const leg2 = haversineDistance(polyline[1], polyline[2]);
    const leg3 = haversineDistance(polyline[2], polyline[3]);

    expect(totalLength).toBeCloseTo(leg1 + leg2 + leg3, 4);
    expect(totalLength).toBeGreaterThan(5000);
  });

  it('interpolates intermediate coordinates along polyline at precise fractional distances', () => {
    const start: [number, number] = [-6.2000, 106.8000];
    const end: [number, number] = [-6.2000, 106.8100];
    const polyline: [number, number][] = [start, end];
    const totalDist = haversineDistance(start, end);

    const atZero = interpolatePositionAlongPolyline(polyline, 0);
    const atHalf = interpolatePositionAlongPolyline(polyline, totalDist * 0.5);
    const atEnd = interpolatePositionAlongPolyline(polyline, totalDist);

    expect(atZero.position[0]).toBeCloseTo(start[0], 5);
    expect(atZero.position[1]).toBeCloseTo(start[1], 5);
    expect(atZero.heading).toBeCloseTo(90, 1); // Heading due East

    expect(atHalf.position[0]).toBeCloseTo(-6.2000, 5);
    expect(atHalf.position[1]).toBeCloseTo(106.8050, 5);
    expect(atHalf.heading).toBeCloseTo(90, 1);

    expect(atEnd.position[0]).toBeCloseTo(end[0], 5);
    expect(atEnd.position[1]).toBeCloseTo(end[1], 5);
  });

  it('calculates dynamic next-stop ETA with transit speed and dwell time', () => {
    const currentDistance = 2000; // 2 km progress
    const nextStopDistance = 5000; // 5 km stop location
    const speedKmh = 60; // MRT 60 km/h = 16.67 m/s
    const speedMultiplier = 1;
    const dwellSeconds = 30;

    // Remaining distance = 3000 m. Travel time = 3000 / (60 * 1000 / 3600) = 180s. Total ETA = 180 + 30 = 210s.
    const eta = calculateNextStopETA(currentDistance, nextStopDistance, speedKmh, speedMultiplier, dwellSeconds);

    expect(eta).toBe(210);
  });
});

describe('Tier 2: Boundary & Corner Geodesic Conditions', () => {
  it('returns exactly 0.0 meters for identical start and end coordinates', () => {
    const point: [number, number] = [-6.2088, 106.8456];
    const dist = haversineDistance(point, point);
    expect(dist).toBe(0);
  });

  it('calculates accurate distance between antipodal points on globe', () => {
    const point1: [number, number] = [0, 0];
    const point2: [number, number] = [0, 180];

    const distanceMeters = haversineDistance(point1, point2);
    const expectedHalfCircumference = Math.PI * EARTH_RADIUS_METERS;

    expect(distanceMeters).toBeCloseTo(expectedHalfCircumference, -2);
  });

  it('calculates cross-track error for point directly collinear with segment as zero', () => {
    const start: [number, number] = [0, 100];
    const end: [number, number] = [0, 110];
    const collinearMidpoint: [number, number] = [0, 105];

    const xtError = crossTrackError(collinearMidpoint, start, end);
    expect(Math.abs(xtError)).toBeLessThan(0.01);
  });

  it('calculates cross-track error for perpendicular offset point accurately', () => {
    const start: [number, number] = [0, 100];
    const end: [number, number] = [0, 110];
    const offsetPoint: [number, number] = [1, 105]; // 1 degree North offset

    const xtError = crossTrackError(offsetPoint, start, end);
    const expectedOffsetMeters = haversineDistance([0, 105], [1, 105]);

    expect(Math.abs(xtError)).toBeCloseTo(expectedOffsetMeters, -2);
    expect(Math.abs(xtError)).toBeGreaterThan(110000); // Approx 111 km
  });

  it('calculates along-track distance of perpendicular point matching midpoint', () => {
    const start: [number, number] = [0, 100];
    const end: [number, number] = [0, 110];
    const offsetPoint: [number, number] = [1, 105];

    const atDist = alongTrackDistance(offsetPoint, start, end);
    const expectedMidDist = haversineDistance(start, [0, 105]);

    expect(atDist).toBeCloseTo(expectedMidDist, -2);
  });

  it('handles polyline interpolation when distance exceeds total length via periodic wraparound', () => {
    const polyline: [number, number][] = [
      [0, 100],
      [0, 101],
    ];
    const length = calculatePolylineLength(polyline);

    // Distance is 2.5 times the length -> should wrap to 0.5 ratio
    const interpolated = interpolatePositionAlongPolyline(polyline, length * 2.5);

    expect(interpolated.position[0]).toBeCloseTo(0, 5);
    expect(interpolated.position[1]).toBeCloseTo(100.5, 5);
    expect(Number.isNaN(interpolated.position[0])).toBe(false);
    expect(Number.isNaN(interpolated.position[1])).toBe(false);
  });

  it('handles edge case of single-point polyline without division by zero', () => {
    const singlePoint: [number, number][] = [[-6.2088, 106.8456]];
    const length = calculatePolylineLength(singlePoint);
    const interpolated = interpolatePositionAlongPolyline(singlePoint, 500);

    expect(length).toBe(0);
    expect(interpolated.position[0]).toBeCloseTo(-6.2088, 5);
    expect(interpolated.position[1]).toBeCloseTo(106.8456, 5);
    expect(interpolated.heading).toBe(0);
  });
});
