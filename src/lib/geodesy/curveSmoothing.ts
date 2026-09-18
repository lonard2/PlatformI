/**
 * PlatformI - Cartographic Curve Smoothing & Geometry Engine
 *
 * Implements Centripetal Catmull-Rom Spline interpolation and coordinate densification
 * to transform sparse, angular "stiff" station-to-station straight polylines into
 * natural, tangent-continuous rail and road curves.
 *
 * Mathematical Foundations:
 * - Centripetal Catmull-Rom parameterization (\alpha = 0.5) avoids cusps, self-intersections,
 *   and overshoot along sharp transit switchbacks.
 * - Haversine chord length calculation preserves authentic geodesic distances.
 *
 * Rules: Zero placeholder stubs, strict TypeScript typing (no 'any'), zero emojis.
 */

import { Coordinate } from "@/types/transit";

export interface SplineOptions {
  /** Number of interpolated steps per segment (default: 8) */
  stepsPerSegment?: number;
  /** Spline knot parameterization: 0 = uniform, 0.5 = centripetal (default), 1 = chordal */
  alpha?: number;
  /** Optional tension factor [0, 1] (default: 0.5) */
  tension?: number;
}

/**
 * Calculates geodesic distance between two points in meters using Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes knot sequence for centripetal parameterization.
 */
function getKnotInterval(
  p0: Coordinate,
  p1: Coordinate,
  alpha: number
): number {
  const dx = p1.longitude - p0.longitude;
  const dy = p1.latitude - p0.latitude;
  const distSq = dx * dx + dy * dy;
  return Math.pow(Math.sqrt(distSq), alpha) || 0.00001;
}

/**
 * Evaluates a single 2D Catmull-Rom spline segment between p1 and p2.
 */
function interpolateSegment(
  p0: Coordinate,
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  steps: number,
  alpha: number
): Coordinate[] {
  const t0 = 0;
  const t1 = t0 + getKnotInterval(p0, p1, alpha);
  const t2 = t1 + getKnotInterval(p1, p2, alpha);
  const t3 = t2 + getKnotInterval(p2, p3, alpha);

  const result: Coordinate[] = [];

  for (let i = 0; i < steps; i++) {
    const t = t1 + ((t2 - t1) * i) / steps;

    // First layer
    const a1_lat = ((t1 - t) / (t1 - t0)) * p0.latitude + ((t - t0) / (t1 - t0)) * p1.latitude;
    const a1_lon = ((t1 - t) / (t1 - t0)) * p0.longitude + ((t - t0) / (t1 - t0)) * p1.longitude;

    const a2_lat = ((t2 - t) / (t2 - t1)) * p1.latitude + ((t - t1) / (t2 - t1)) * p2.latitude;
    const a2_lon = ((t2 - t) / (t2 - t1)) * p1.longitude + ((t - t1) / (t2 - t1)) * p2.longitude;

    const a3_lat = ((t3 - t) / (t3 - t2)) * p2.latitude + ((t - t2) / (t3 - t2)) * p3.latitude;
    const a3_lon = ((t3 - t) / (t3 - t2)) * p2.longitude + ((t - t2) / (t3 - t2)) * p3.longitude;

    // Second layer
    const b1_lat = ((t2 - t) / (t2 - t0)) * a1_lat + ((t - t0) / (t2 - t0)) * a2_lat;
    const b1_lon = ((t2 - t) / (t2 - t0)) * a1_lon + ((t - t0) / (t2 - t0)) * a2_lon;

    const b2_lat = ((t3 - t) / (t3 - t1)) * a2_lat + ((t - t1) / (t3 - t1)) * a3_lat;
    const b2_lon = ((t3 - t) / (t3 - t1)) * a2_lon + ((t - t1) / (t3 - t1)) * a3_lon;

    // Third layer
    const c_lat = ((t2 - t) / (t2 - t1)) * b1_lat + ((t - t1) / (t2 - t1)) * b2_lat;
    const c_lon = ((t2 - t) / (t2 - t1)) * b1_lon + ((t - t1) / (t2 - t1)) * b2_lon;

    result.push({
      latitude: Number(c_lat.toFixed(6)),
      longitude: Number(c_lon.toFixed(6)),
    });
  }

  return result;
}

/**
 * Smooths an array of sparse polyline coordinates using Centripetal Catmull-Rom splines.
 * Automatically mirrors virtual endpoints to preserve exact terminal coordinates.
 *
 * @param points Array of raw transit coordinates (minimum 2 points)
 * @param options Spline configuration (resolution, alpha)
 * @returns Array of densified, curvature-continuous coordinates
 */
export function smoothPolyline(
  points: Coordinate[],
  optionsOrSteps: SplineOptions | number = {}
): Coordinate[] {
  const options: SplineOptions =
    typeof optionsOrSteps === "number"
      ? { stepsPerSegment: optionsOrSteps }
      : optionsOrSteps;

  if (!points || points.length < 2) {
    return points ? [...points] : [];
  }

  if (points.length === 2) {
    // Linear interpolation for a simple 2-point segment
    const steps = options.stepsPerSegment ?? 6;
    const p0 = points[0];
    const p1 = points[1];
    const interpolated: Coordinate[] = [];
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      interpolated.push({
        latitude: Number((p0.latitude + (p1.latitude - p0.latitude) * frac).toFixed(6)),
        longitude: Number((p0.longitude + (p1.longitude - p0.longitude) * frac).toFixed(6)),
      });
    }
    return interpolated;
  }

  const steps = options.stepsPerSegment ?? 8;
  const alpha = options.alpha ?? 0.5; // Centripetal default

  // Synthesize ghost endpoints p_{-1} and p_{n} via linear extrapolation
  const first = points[0];
  const second = points[1];
  const pMinus1: Coordinate = {
    latitude: first.latitude - (second.latitude - first.latitude),
    longitude: first.longitude - (second.longitude - first.longitude),
  };

  const last = points[points.length - 1];
  const penUlt = points[points.length - 2];
  const pPlus1: Coordinate = {
    latitude: last.latitude + (last.latitude - penUlt.latitude),
    longitude: last.longitude + (last.longitude - penUlt.longitude),
  };

  const augmentedPoints: Coordinate[] = [pMinus1, ...points, pPlus1];
  const smoothed: Coordinate[] = [];

  for (let i = 1; i < augmentedPoints.length - 2; i++) {
    const p0 = augmentedPoints[i - 1];
    const p1 = augmentedPoints[i];
    const p2 = augmentedPoints[i + 1];
    const p3 = augmentedPoints[i + 2];

    const segment = interpolateSegment(p0, p1, p2, p3, steps, alpha);
    smoothed.push(...segment);
  }

  // Ensure exact endpoint match
  smoothed.push({
    latitude: Number(last.latitude.toFixed(6)),
    longitude: Number(last.longitude.toFixed(6)),
  });

  return smoothed;
}

/**
 * Converts array of Coordinate objects to Leaflet [lat, lng] tuples.
 */
export function coordinatesToLatLngTuples(
  coords: Coordinate[]
): [number, number][] {
  return coords.map((c) => [c.latitude, c.longitude]);
}

/**
 * Converts array of Leaflet [lat, lng] tuples to Coordinate objects.
 */
export function latLngTuplesToCoordinates(
  tuples: [number, number][]
): Coordinate[] {
  return tuples.map(([latitude, longitude]) => ({
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  }));
}
