/**
 * PlatformI - Vehicle Divergence, Offset & ETA Pure Math Engines
 *
 * Provides pure, zero-side-effect functions for:
 * 1. Modulating cruising speed via speedModifier clamped to [0.1, 2.5].
 * 2. Calculating ETA dilation incorporating active vehicle delays and congestion holds.
 * 3. Applying perpendicular lateral lane offsets for road vehicles to prevent overlapping.
 * 4. Spatial detour polyline interpolation and stop projection.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { Coordinate } from "@/types/transit";
import { LatLngInput, extractCoord, haversineDistance, calculatePolylineLength, interpolatePositionAlongPolyline } from "@/lib/math/geodesy";
import { VehicleOperationalStatus, TransitCategory } from "@/types/transit";

/**
 * Bounds vehicle speed modifier between 0.1 and 2.5 to prevent negative speeds or runaway calculations.
 */
export function clampSpeedModifier(speedModifier?: number): number {
  if (speedModifier === undefined || speedModifier === null || Number.isNaN(speedModifier)) {
    return 1.0;
  }
  return Math.min(2.5, Math.max(0.1, speedModifier));
}

/**
 * Calculates modulated vehicle speed in km/h based on nominal speed and vehicle modifier.
 */
export function calculateModulatedSpeed(baseSpeedKmh: number, speedModifier?: number): number {
  const mod = clampSpeedModifier(speedModifier);
  return Math.max(1, Math.round(baseSpeedKmh * mod * 10) / 10);
}

/**
 * Calculates dynamic next-stop ETA in seconds, taking into account:
 * - Base travel time to stop at current cruising speed
 * - Dilation by vehicle delayMinutes
 * - Zeroing / freezing progress if vehicle is in CONGESTION_HOLD
 */
export function calculateDivergentEta(
  baseEtaSeconds: number,
  delayMinutes?: number,
  status?: VehicleOperationalStatus
): number {
  if (baseEtaSeconds === Infinity || baseEtaSeconds < 0) {
    return Infinity;
  }

  const delaySec = Math.max(0, (delayMinutes ?? 0) * 60);
  let totalEta = baseEtaSeconds + delaySec;

  // Under congestion hold, vehicle is physically stopped/dwelling in traffic
  if (status === "CONGESTION_HOLD") {
    // Retain full ETA + delay
    return Math.max(60, totalEta);
  }

  return Math.round(totalEta);
}

/**
 * Computes a lateral lane offset coordinate perpendicular to the heading azimuth.
 * Offset distance is in meters (positive = right lane, negative = left lane).
 * Converts meters to degrees latitude & longitude offset.
 */
export function applyLateralLaneOffset(
  position: [number, number],
  headingDegrees: number,
  offsetMeters: number
): [number, number] {
  if (offsetMeters === 0) return position;

  // Perpendicular angle: 90 degrees clockwise (to the right of the heading)
  const perpBearingRad = ((headingDegrees + 90) * Math.PI) / 180;

  // Approximate meter-to-degree conversions on Earth surface
  // 1 deg latitude ≈ 111,139 meters
  // 1 deg longitude ≈ 111,139 * cos(lat) meters
  const latOffsetDeg = (offsetMeters * Math.cos(perpBearingRad)) / 111139;
  const latRad = (position[0] * Math.PI) / 180;
  const lonScale = Math.cos(latRad);
  const lonOffsetDeg =
    Math.abs(lonScale) > 0.0001
      ? (offsetMeters * Math.sin(perpBearingRad)) / (111139 * lonScale)
      : 0;

  return [position[0] + latOffsetDeg, position[1] + lonOffsetDeg];
}

/**
 * Computes deterministic hash-based lane offset for road vehicles (BUS category).
 * Produces smooth lateral separation between -3.5m and +3.5m based on vehicle ID.
 */
export function getRoadVehicleLaneOffset(
  vehicleId: string,
  category?: TransitCategory
): number {
  if (category !== "BUS") {
    return 0;
  }

  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = (hash * 31 + vehicleId.charCodeAt(i)) & 0xffffffff;
  }

  // Generate deterministic offset in range [-2.8m, +2.8m]
  const normalized = (Math.abs(hash) % 100) / 100; // 0.0 - 0.99
  const offset = (normalized - 0.5) * 5.6; // -2.8 to +2.8 meters
  return Math.round(offset * 10) / 10;
}

/**
 * Detour Path Evaluation and Projection Cache structure
 */
export interface DetourProjection {
  totalLength: number;
  interpolated: {
    position: [number, number];
    coordinate: Coordinate;
    heading: number;
    segmentIndex: number;
  };
}

/**
 * Evaluates vehicle coordinate & heading along detour coordinates.
 */
export function interpolateDetourPath(
  detourCoordinates: Coordinate[],
  distanceMeters: number
): {
  position: [number, number];
  coordinate: Coordinate;
  heading: number;
  segmentIndex: number;
  totalLength: number;
} {
  const totalLength = calculatePolylineLength(detourCoordinates);
  if (totalLength === 0 || detourCoordinates.length < 2) {
    const p0 = extractCoord(detourCoordinates[0] || [0, 0]);
    return {
      position: p0,
      coordinate: { latitude: p0[0], longitude: p0[1] },
      heading: 0,
      segmentIndex: 0,
      totalLength: 0,
    };
  }

  const result = interpolatePositionAlongPolyline(detourCoordinates, distanceMeters);
  return {
    ...result,
    totalLength,
  };
}
