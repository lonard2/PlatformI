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

/**
 * Generates route polyline coordinates from an ordered list of transit stops.
 */
export function generatePathFromStops(
  stops: { latitude: number; longitude: number; sequence: number }[],
  smooth: boolean = true
): Coordinate[] {
  if (!stops || stops.length === 0) return [];
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const raw: Coordinate[] = sorted.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
  }));

  return smooth ? smoothPolyline(raw, { stepsPerSegment: 6 }) : raw;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "LineString" | "Point";
    coordinates: number[] | number[][];
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Converts a Transit Line and optional Stops to standard RFC 7946 GeoJSON.
 */
export function lineToGeoJSON(
  line: {
    id: string;
    code: string;
    name: string;
    category?: string;
    mode?: string;
    colorHex?: string;
    polylineCoordinates: Coordinate[];
  },
  stops: {
    id: string;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    sequence: number;
    isInterchange?: boolean;
    platformType?: string;
  }[] = []
): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];

  // 1. LineString feature for polyline path
  if (line.polylineCoordinates && line.polylineCoordinates.length >= 2) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        // GeoJSON coordinate order: [longitude, latitude]
        coordinates: line.polylineCoordinates.map((c) => [c.longitude, c.latitude]),
      },
      properties: {
        id: line.id,
        code: line.code,
        name: line.name,
        category: line.category,
        mode: line.mode,
        colorHex: line.colorHex,
      },
    });
  }

  // 2. Point features for each station/stop
  stops.forEach((stop) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [stop.longitude, stop.latitude],
      },
      properties: {
        id: stop.id,
        name: stop.name,
        code: stop.code,
        sequence: stop.sequence,
        isInterchange: Boolean(stop.isInterchange),
        platformType: stop.platformType || "ISLAND",
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export interface ParsedGeoJSONResult {
  code?: string;
  name?: string;
  colorHex?: string;
  polylineCoordinates: Coordinate[];
  stops: {
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    sequence: number;
    isInterchange?: boolean;
  }[];
}

/**
 * Parses GeoJSON string into polyline coordinates and stops for ingestion.
 */
export function parseGeoJSONToLine(geoJsonString: string): ParsedGeoJSONResult {
  const parsed = JSON.parse(geoJsonString) as {
    type?: string;
    features?: GeoJSONFeature[];
    geometry?: { type: string; coordinates: unknown };
    properties?: Record<string, unknown>;
  };

  const result: ParsedGeoJSONResult = {
    polylineCoordinates: [],
    stops: [],
  };

  const features: GeoJSONFeature[] =
    parsed.type === "FeatureCollection" && Array.isArray(parsed.features)
      ? parsed.features
      : parsed.type === "Feature"
      ? [(parsed as GeoJSONFeature)]
      : [];

  let seqCounter = 1;

  for (const feat of features) {
    if (feat.geometry?.type === "LineString" && Array.isArray(feat.geometry.coordinates)) {
      const coords = feat.geometry.coordinates as [number, number][];
      result.polylineCoordinates = coords.map(([lon, lat]) => ({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
      }));

      if (feat.properties) {
        if (typeof feat.properties.code === "string") result.code = feat.properties.code;
        if (typeof feat.properties.name === "string") result.name = feat.properties.name;
        if (typeof feat.properties.colorHex === "string") result.colorHex = feat.properties.colorHex;
      }
    } else if (feat.geometry?.type === "Point" && Array.isArray(feat.geometry.coordinates)) {
      const [lon, lat] = feat.geometry.coordinates as [number, number];
      const p = feat.properties || {};
      result.stops.push({
        name: typeof p.name === "string" ? p.name : `Stop ${seqCounter}`,
        code: typeof p.code === "string" ? p.code : `ST-${seqCounter}`,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
        sequence: typeof p.sequence === "number" ? p.sequence : seqCounter,
        isInterchange: Boolean(p.isInterchange),
      });
      seqCounter++;
    }
  }

  return result;
}

/**
 * Snaps a sequence of road transit waypoints to real OpenStreetMap road geometry via OSRM.
 * Falls back to local Centripetal Catmull-Rom spline smoothing if offline or timeout.
 */
export async function snapRouteToRoads(
  coordinates: Coordinate[],
  signalTimeoutMs: number = 3000
): Promise<Coordinate[]> {
  if (!coordinates || coordinates.length < 2) return coordinates;

  try {
    const coordString = coordinates.map((c) => `${c.longitude},${c.latitude}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), signalTimeoutMs);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OSRM API error: ${res.status}`);

    const json = await res.json();
    if (json.routes && json.routes[0]?.geometry?.coordinates) {
      const roadCoords: [number, number][] = json.routes[0].geometry.coordinates;
      return roadCoords.map(([lon, lat]) => ({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lon.toFixed(6)),
      }));
    }
    throw new Error("Invalid OSRM geometry payload");
  } catch {
    // Graceful fallback to Centripetal Catmull-Rom spline
    return smoothPolyline(coordinates, { stepsPerSegment: 6 });
  }
}

/**
 * Simplifies a dense or jagged polyline using the Ramer-Douglas-Peucker algorithm.
 * Reduces vertex count while preserving overall geometric corridor alignment.
 *
 * @param coordinates Array of coordinates to simplify
 * @param toleranceMeters Maximum allowable deviation distance in meters (default: 20m)
 */
export function simplifyPolyline(
  coordinates: Coordinate[],
  toleranceMeters: number = 20
): Coordinate[] {
  if (coordinates.length <= 2) return coordinates;

  // Equirectangular projection helper centered at mean latitude
  const meanLat =
    coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length;
  const latFactor = 111320; // meters per degree latitude
  const lonFactor = 111320 * Math.cos((meanLat * Math.PI) / 180); // meters per degree longitude

  function toXY(c: Coordinate): [number, number] {
    return [c.longitude * lonFactor, c.latitude * latFactor];
  }

  function perpendicularDistance(
    pt: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const dpx = pt[0] - lineStart[0];
      const dpy = pt[1] - lineStart[1];
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    const num = Math.abs(dy * pt[0] - dx * pt[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]);
    return num / Math.sqrt(lenSq);
  }

  function rdpRecursive(pts: Coordinate[]): Coordinate[] {
    if (pts.length <= 2) return pts;

    let maxDist = 0;
    let maxIdx = 0;
    const startPt = toXY(pts[0]);
    const endPt = toXY(pts[pts.length - 1]);

    for (let i = 1; i < pts.length - 1; i++) {
      const dist = perpendicularDistance(toXY(pts[i]), startPt, endPt);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > toleranceMeters) {
      const left = rdpRecursive(pts.slice(0, maxIdx + 1));
      const right = rdpRecursive(pts.slice(maxIdx));
      return left.slice(0, left.length - 1).concat(right);
    } else {
      return [pts[0], pts[pts.length - 1]];
    }
  }

  return rdpRecursive(coordinates);
}

