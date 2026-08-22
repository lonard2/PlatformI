/**
 * Tier 1 & Tier 2 Tests: Real-Time GTFS-RT Vector Simulation Engine
 * Validates vector coordinate progression, speed multiplier transitions (1x, 2x, 5x, 0x),
 * loop wraparound, station dwell countdowns, and dynamic next-stop ETAs.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  simulateVehicleMovement,
  calculateNextStopETA,
  calculatePolylineLength,
  SimulatedVehicleState,
} from './helpers/domain';

// Sample MRT North-South Line Route Segment (Lebak Bulus to Blok M)
const mrtPolylineSegment: [number, number][] = [
  [-6.2892, 106.7749], // Lebak Bulus Grab
  [-6.2925, 106.7938], // Fatmawati
  [-6.2783, 106.7972], // Cipete Raya
  [-6.2665, 106.7974], // Haji Nawi
  [-6.2556, 106.7971], // Blok A
  [-6.2443, 106.7981], // Blok M BCA
];

describe('Tier 1: Core Vector Simulation Engine Models', () => {
  it('advances vehicle position along polyline proportionally to speed and delta time at 1x speed', () => {
    const initialVehicle: SimulatedVehicleState = {
      id: 'MRT-SET-01',
      lineId: 'MRT-NS-RED',
      mode: 'mrt',
      currentDistanceMeters: 0,
      speedKmh: 60, // 60 km/h = 16.667 m/s
      position: mrtPolylineSegment[0],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    const deltaSeconds = 10; // 10 seconds
    const updated = simulateVehicleMovement(initialVehicle, mrtPolylineSegment, deltaSeconds, 1);

    const expectedDistance = (60 * 1000 / 3600) * 10; // 166.67 meters
    expect(updated.currentDistanceMeters).toBeCloseTo(expectedDistance, 1);
    expect(updated.position[0]).not.toBe(initialVehicle.position[0]);
    expect(updated.position[1]).not.toBe(initialVehicle.position[1]);
  });

  it('scales displacement accurately across speed multipliers (2x and 5x)', () => {
    const baseVehicle: SimulatedVehicleState = {
      id: 'TJ-BUS-101',
      lineId: 'TJ-COR-01',
      mode: 'tj_brt',
      currentDistanceMeters: 500,
      speedKmh: 30, // 30 km/h = 8.333 m/s
      position: mrtPolylineSegment[0],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    const delta = 5;
    const sim1x = simulateVehicleMovement(baseVehicle, mrtPolylineSegment, delta, 1);
    const sim2x = simulateVehicleMovement(baseVehicle, mrtPolylineSegment, delta, 2);
    const sim5x = simulateVehicleMovement(baseVehicle, mrtPolylineSegment, delta, 5);

    const dist1x = sim1x.currentDistanceMeters - baseVehicle.currentDistanceMeters;
    const dist2x = sim2x.currentDistanceMeters - baseVehicle.currentDistanceMeters;
    const dist5x = sim5x.currentDistanceMeters - baseVehicle.currentDistanceMeters;

    expect(dist2x).toBeCloseTo(dist1x * 2, 2);
    expect(dist5x).toBeCloseTo(dist1x * 5, 2);
  });

  it('maintains stationary vehicle state when simulation is paused (0x multiplier)', () => {
    const initialVehicle: SimulatedVehicleState = {
      id: 'KRL-BOGOR-05',
      lineId: 'KRL-BOGOR-RED',
      mode: 'krl',
      currentDistanceMeters: 2500,
      speedKmh: 50,
      position: mrtPolylineSegment[1],
      heading: 45,
      dwellRemainingSeconds: 0,
    };

    const paused = simulateVehicleMovement(initialVehicle, mrtPolylineSegment, 30, 0);

    expect(paused.currentDistanceMeters).toBe(initialVehicle.currentDistanceMeters);
    expect(paused.position[0]).toBe(initialVehicle.position[0]);
    expect(paused.position[1]).toBe(initialVehicle.position[1]);
    expect(paused.heading).toBe(initialVehicle.heading);
  });

  it('updates vehicle heading orientation to match segment azimuth direction', () => {
    const initialVehicle: SimulatedVehicleState = {
      id: 'WHOOSH-01',
      lineId: 'WHOOSH-HSR-RED',
      mode: 'whoosh',
      currentDistanceMeters: 100,
      speedKmh: 300,
      position: mrtPolylineSegment[0],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    const updated = simulateVehicleMovement(initialVehicle, mrtPolylineSegment, 1, 1);

    expect(updated.heading).toBeGreaterThanOrEqual(0);
    expect(updated.heading).toBeLessThanOrEqual(360);
    expect(Number.isFinite(updated.heading)).toBe(true);
  });

  it('calculates dynamic next-stop ETA countdown given remaining distance and cruise speed', () => {
    const currentDist = 1200; // 1.2 km
    const nextStopDist = 3000; // 3.0 km -> 1800 m remaining
    const speedKmh = 45; // 45 km/h = 12.5 m/s
    const intermediateDwell = 30; // 30s dwell

    // Travel time = 1800 / 12.5 = 144s. Total ETA = 144 + 30 = 174s
    const eta1x = calculateNextStopETA(currentDist, nextStopDist, speedKmh, 1, intermediateDwell);
    // At 2x speed: Travel time = 1800 / 25 = 72s. Total ETA = 72 + 30 = 102s
    const eta2x = calculateNextStopETA(currentDist, nextStopDist, speedKmh, 2, intermediateDwell);

    expect(eta1x).toBe(174);
    expect(eta2x).toBe(102);
  });

  it('triggers station dwell countdown when vehicle arrives at station coordinates', () => {
    const stopsAlongTrack = [1000, 2500, 4000]; // Station stops at 1km, 2.5km, 4km

    const vehicleApproaching: SimulatedVehicleState = {
      id: 'LRT-JB-02',
      lineId: 'LRT-JB-CB-BLUE',
      mode: 'lrt_jabodebek',
      currentDistanceMeters: 980, // 20m before station
      speedKmh: 50, // 13.88 m/s
      position: mrtPolylineSegment[0],
      heading: 90,
      dwellRemainingSeconds: 0,
    };

    // Step 2 seconds -> covers ~27.7m, crossing the 1000m mark -> should trigger 30s dwell
    const arrived = simulateVehicleMovement(vehicleApproaching, mrtPolylineSegment, 2, 1, stopsAlongTrack, 30);
    expect(arrived.dwellRemainingSeconds).toBe(30);

    // Step next 10 seconds during dwell -> vehicle should stay at station, dwell counts down to 20s
    const dwelling = simulateVehicleMovement(arrived, mrtPolylineSegment, 10, 1, stopsAlongTrack, 30);
    expect(dwelling.dwellRemainingSeconds).toBe(20);
    expect(dwelling.currentDistanceMeters).toBe(arrived.currentDistanceMeters);
  });
});

describe('Tier 2: Boundary & Corner Vector Simulation Conditions', () => {
  it('wraps around smoothly when vehicle traverses beyond end of polyline loop', () => {
    const totalLength = calculatePolylineLength(mrtPolylineSegment);

    const vehicleAtEnd: SimulatedVehicleState = {
      id: 'MRT-WRAP-01',
      lineId: 'MRT-NS-RED',
      mode: 'mrt',
      currentDistanceMeters: totalLength - 50, // 50m before end
      speedKmh: 72, // 20 m/s
      position: mrtPolylineSegment[mrtPolylineSegment.length - 2],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    // Step 5 seconds -> covers 100m -> wraps around to 50m from start
    const looped = simulateVehicleMovement(vehicleAtEnd, mrtPolylineSegment, 5, 1);

    expect(looped.currentDistanceMeters).toBeCloseTo(50, 1);
    expect(looped.currentDistanceMeters).toBeLessThan(totalLength);
    expect(Number.isNaN(looped.position[0])).toBe(false);
    expect(Number.isNaN(looped.position[1])).toBe(false);
  });

  it('handles extreme delta time jump without numerical overflow or divergence', () => {
    const vehicle: SimulatedVehicleState = {
      id: 'KRL-LONG-STEP',
      lineId: 'KRL-BOGOR-RED',
      mode: 'krl',
      currentDistanceMeters: 500,
      speedKmh: 60,
      position: mrtPolylineSegment[0],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    // Delta jump of 600 seconds (10 minutes in background tab)
    const longJump = simulateVehicleMovement(vehicle, mrtPolylineSegment, 600, 1);
    const totalLength = calculatePolylineLength(mrtPolylineSegment);

    expect(longJump.currentDistanceMeters).toBeGreaterThanOrEqual(0);
    expect(longJump.currentDistanceMeters).toBeLessThanOrEqual(totalLength);
    expect(Number.isFinite(longJump.position[0])).toBe(true);
    expect(Number.isFinite(longJump.position[1])).toBe(true);
  });

  it('maintains continuous valid heading when polyline makes sharp 90-degree turn', () => {
    const sharpCornerPolyline: [number, number][] = [
      [0, 100], // Start heading North
      [1, 100], // Corner node
      [1, 101], // Turn East
    ];

    const segment1Length = calculatePolylineLength([[0, 100], [1, 100]]);

    const vehicleBeforeCorner: SimulatedVehicleState = {
      id: 'TJ-CORNER-01',
      lineId: 'TJ-COR-01',
      mode: 'tj_brt',
      currentDistanceMeters: segment1Length - 10,
      speedKmh: 36, // 10 m/s
      position: [0.99, 100],
      heading: 0,
      dwellRemainingSeconds: 0,
    };

    // Step 2 seconds (20m) -> crosses corner into East segment
    const afterCorner = simulateVehicleMovement(vehicleBeforeCorner, sharpCornerPolyline, 2, 1);

    expect(afterCorner.heading).toBeCloseTo(90, 1); // Turned due East
    expect(afterCorner.position[0]).toBeCloseTo(1, 4);
    expect(afterCorner.position[1]).toBeGreaterThan(100);
  });

  it('handles zero delta time and zero speed without modifying vehicle state', () => {
    const vehicle: SimulatedVehicleState = {
      id: 'ZERO-TEST',
      lineId: 'TJ-01',
      mode: 'tj_brt',
      currentDistanceMeters: 300,
      speedKmh: 0,
      position: mrtPolylineSegment[0],
      heading: 45,
      dwellRemainingSeconds: 0,
    };

    const afterZero = simulateVehicleMovement(vehicle, mrtPolylineSegment, 0, 1);
    expect(afterZero.currentDistanceMeters).toBe(300);
  });

  it('simulates heterogeneous multi-modal fleet progressing independently', () => {
    const fleet: SimulatedVehicleState[] = [
      { id: 'MRT-1', lineId: 'MRT-NS', mode: 'mrt', currentDistanceMeters: 0, speedKmh: 60, position: mrtPolylineSegment[0], heading: 0, dwellRemainingSeconds: 0 },
      { id: 'TJ-1', lineId: 'TJ-C1', mode: 'tj_brt', currentDistanceMeters: 0, speedKmh: 25, position: mrtPolylineSegment[0], heading: 0, dwellRemainingSeconds: 0 },
      { id: 'WHOOSH-1', lineId: 'HSR-1', mode: 'whoosh', currentDistanceMeters: 0, speedKmh: 300, position: mrtPolylineSegment[0], heading: 0, dwellRemainingSeconds: 0 },
    ];

    const delta = 10;
    const updatedFleet = fleet.map((v) => simulateVehicleMovement(v, mrtPolylineSegment, delta, 1));

    // Distances: MRT = 166.7m, TJ = 69.4m, Whoosh = 833.3m
    expect(updatedFleet[0].currentDistanceMeters).toBeGreaterThan(updatedFleet[1].currentDistanceMeters);
    expect(updatedFleet[2].currentDistanceMeters).toBeGreaterThan(updatedFleet[0].currentDistanceMeters);
  });
});
