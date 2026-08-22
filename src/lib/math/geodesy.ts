/**
 * PlatformI - Spherical Geodesy & Vector Mathematics Library
 * Pure mathematical functions for Haversine distance, initial azimuth bearing,
 * along-track distance, cross-track error, polyline interpolation, and next-stop ETA.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { Coordinate } from "@/types/transit";

export const EARTH_RADIUS_METERS = 6371000; // Mean Earth Radius in meters (6,371 km)

export type LatLngInput = Coordinate | [number, number];

/**
 * Normalizes coordinate input from either `{ latitude, longitude }` or `[lat, lon]` tuple.
 */
export function extractCoord(coord: LatLngInput): [number, number] {
  if (Array.isArray(coord)) {
    return [coord[0], coord[1]];
  }
  return [coord.latitude, coord.longitude];
}

/**
 * Converts decimal degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to decimal degrees.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates great-circle surface distance between two coordinates in meters using the Haversine formula.
 */
export function haversineDistance(coord1: LatLngInput, coord2: LatLngInput): number {
  const [lat1, lon1] = extractCoord(coord1);
  const [lat2, lon2] = extractCoord(coord2);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates initial azimuth bearing in degrees (0 to 360) from startCoord to endCoord.
 * 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function calculateBearing(startCoord: LatLngInput, endCoord: LatLngInput): number {
  const [lat1, lon1] = extractCoord(startCoord);
  const [lat2, lon2] = extractCoord(endCoord);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLon = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);

  const initialBearingRadians = Math.atan2(y, x);
  const initialBearingDegrees = toDegrees(initialBearingRadians);

  return (initialBearingDegrees + 360) % 360;
}

/**
 * Calculates total cumulative surface length of a polyline in meters.
 */
export function calculatePolylineLength(polyline: LatLngInput[]): number {
  if (polyline.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    totalMeters += haversineDistance(polyline[i], polyline[i + 1]);
  }
  return totalMeters;
}

/**
 * Calculates cross-track distance in meters of point P relative to great-circle segment A->B.
 * Returns positive if P is to the right of A->B, negative if to the left.
 */
export function crossTrackError(
  point: LatLngInput,
  startCoord: LatLngInput,
  endCoord: LatLngInput
): number {
  const distAP = haversineDistance(startCoord, point);
  if (distAP === 0) return 0;

  const delta13 = distAP / EARTH_RADIUS_METERS;
  const theta13 = toRadians(calculateBearing(startCoord, point));
  const theta12 = toRadians(calculateBearing(startCoord, endCoord));

  const dXt = Math.asin(Math.sin(delta13) * Math.sin(theta13 - theta12)) * EARTH_RADIUS_METERS;
  return dXt;
}

/**
 * Calculates along-track distance in meters of point P projected along segment A->B.
 */
export function alongTrackDistance(
  point: LatLngInput,
  startCoord: LatLngInput,
  endCoord: LatLngInput
): number {
  const distAP = haversineDistance(startCoord, point);
  const dXt = crossTrackError(point, startCoord, endCoord);

  const delta13 = distAP / EARTH_RADIUS_METERS;
  const deltaXt = dXt / EARTH_RADIUS_METERS;

  const cosDeltaAt = Math.cos(delta13) / Math.cos(deltaXt);
  const clampedCos = Math.max(-1, Math.min(1, cosDeltaAt));
  const dAt = Math.acos(clampedCos) * EARTH_RADIUS_METERS;

  return dAt;
}

/**
 * Interpolates coordinate position, heading angle, and segment index along a polyline at a given along-track distance in meters.
 * Handles fractional progress, total loop wraparound, and edge conditions.
 */
export function interpolatePositionAlongPolyline(
  polyline: LatLngInput[],
  distanceMeters: number
): {
  position: [number, number];
  coordinate: Coordinate;
  heading: number;
  segmentIndex: number;
} {
  if (polyline.length === 0) {
    return {
      position: [0, 0],
      coordinate: { latitude: 0, longitude: 0 },
      heading: 0,
      segmentIndex: 0,
    };
  }

  const p0 = extractCoord(polyline[0]);
  if (polyline.length === 1) {
    return {
      position: p0,
      coordinate: { latitude: p0[0], longitude: p0[1] },
      heading: 0,
      segmentIndex: 0,
    };
  }

  const totalLength = calculatePolylineLength(polyline);
  if (totalLength === 0) {
    return {
      position: p0,
      coordinate: { latitude: p0[0], longitude: p0[1] },
      heading: 0,
      segmentIndex: 0,
    };
  }

  // Handle wraparound for continuous loop simulation
  let targetDistance = distanceMeters;
  if (distanceMeters >= totalLength && distanceMeters === totalLength) {
    targetDistance = totalLength;
  } else {
    targetDistance = distanceMeters % totalLength;
    if (targetDistance < 0) targetDistance += totalLength;
  }

  let accumulatedDistance = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const ptA = extractCoord(polyline[i]);
    const ptB = extractCoord(polyline[i + 1]);
    const segmentLength = haversineDistance(ptA, ptB);

    if (accumulatedDistance + segmentLength >= targetDistance) {
      const segmentOffset = targetDistance - accumulatedDistance;
      const ratio = segmentLength > 0 ? segmentOffset / segmentLength : 0;

      const lat = ptA[0] + ratio * (ptB[0] - ptA[0]);
      const lon = ptA[1] + ratio * (ptB[1] - ptA[1]);
      const heading = calculateBearing(ptA, ptB);

      return {
        position: [lat, lon],
        coordinate: { latitude: lat, longitude: lon },
        heading,
        segmentIndex: i,
      };
    }
    accumulatedDistance += segmentLength;
  }

  const lastIdx = polyline.length - 2;
  const pLastA = extractCoord(polyline[lastIdx]);
  const pLastB = extractCoord(polyline[lastIdx + 1]);
  return {
    position: pLastB,
    coordinate: { latitude: pLastB[0], longitude: pLastB[1] },
    heading: calculateBearing(pLastA, pLastB),
    segmentIndex: lastIdx,
  };
}

/**
 * Finds the closest point on a polyline to a given reference point P.
 */
export function findNearestPointOnPolyline(
  point: LatLngInput,
  polyline: LatLngInput[]
): {
  nearestPoint: Coordinate;
  distanceMeters: number;
  segmentIndex: number;
  alongTrackMeters: number;
} {
  if (polyline.length === 0) {
    return {
      nearestPoint: { latitude: 0, longitude: 0 },
      distanceMeters: Infinity,
      segmentIndex: 0,
      alongTrackMeters: 0,
    };
  }

  const p0 = extractCoord(polyline[0]);
  if (polyline.length === 1) {
    return {
      nearestPoint: { latitude: p0[0], longitude: p0[1] },
      distanceMeters: haversineDistance(point, p0),
      segmentIndex: 0,
      alongTrackMeters: 0,
    };
  }

  let minDistance = Infinity;
  let bestPoint: Coordinate = { latitude: p0[0], longitude: p0[1] };
  let bestSegmentIndex = 0;
  let bestAlongTrack = 0;
  let accumulatedAlongTrack = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ptA = extractCoord(polyline[i]);
    const ptB = extractCoord(polyline[i + 1]);
    const segmentLength = haversineDistance(ptA, ptB);

    if (segmentLength === 0) continue;

    const atDist = alongTrackDistance(point, ptA, ptB);
    const clampedAt = Math.max(0, Math.min(segmentLength, atDist));
    const ratio = clampedAt / segmentLength;

    const candLat = ptA[0] + ratio * (ptB[0] - ptA[0]);
    const candLon = ptA[1] + ratio * (ptB[1] - ptA[1]);
    const candCoord: Coordinate = { latitude: candLat, longitude: candLon };
    const dist = haversineDistance(point, candCoord);

    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = candCoord;
      bestSegmentIndex = i;
      bestAlongTrack = accumulatedAlongTrack + clampedAt;
    }

    accumulatedAlongTrack += segmentLength;
  }

  return {
    nearestPoint: bestPoint,
    distanceMeters: minDistance,
    segmentIndex: bestSegmentIndex,
    alongTrackMeters: bestAlongTrack,
  };
}

/**
 * Calculates dynamic ETA in seconds to the next stop with consideration of cruising speed and dwell time.
 */
export function calculateNextStopEta(
  currentDistanceMeters: number,
  nextStopDistanceMeters: number,
  speedKmh: number,
  speedMultiplier: number = 1,
  intermediateDwellSeconds: number = 0
): number {
  if (speedMultiplier === 0) return Infinity;
  const speedMps = (speedKmh * 1000) / 3600;
  if (speedMps <= 0) return Infinity;

  const distanceRemaining = Math.max(0, nextStopDistanceMeters - currentDistanceMeters);
  const travelTimeSeconds = distanceRemaining / (speedMps * speedMultiplier);
  return Math.round(travelTimeSeconds + intermediateDwellSeconds);
}
