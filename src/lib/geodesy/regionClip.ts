/**
 * Gateway-mode geometry scoping.
 *
 * Intercity gateway modes (AKAP buses, executive shuttles, long-distance
 * rail, PELNI ships) carry schematic straight-line tails to far cities.
 * Those tails are route hints, not mapped corridors, so map layers clip
 * them to the active region boundary. Genuine corridors (KRL, Whoosh,
 * TransJakarta, Seribu speedboats) render in full regardless of bounds.
 */

import type { Coordinate, TransitMode } from "@/types/transit";

export const GATEWAY_MODES: TransitMode[] = [
  "KAI_INTERCITY",
  "AKAP_INTERCITY_BUS",
  "EXECUTIVE_SHUTTLE",
  "MARITIME_PELNI",
];

export function isGatewayMode(mode: TransitMode): boolean {
  return GATEWAY_MODES.includes(mode);
}

/** Ray-casting point-in-polygon on planar lat/lng; edges count as inside. */
export function pointInPolygon(
  latitude: number,
  longitude: number,
  polygon: Coordinate[]
): boolean {
  if (polygon.length === 0) return true;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const epsilon = 1e-9;
  const onSegment = (
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
  ): boolean => {
    const cross = (by - ay) * (px - ax) - (bx - ax) * (py - ay);
    if (Math.abs(cross) > epsilon) return false;
    const dot = (px - ax) * (px - bx) + (py - ay) * (py - by);
    return dot <= epsilon;
  };
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]?.longitude ?? 0;
    const yi = polygon[i]?.latitude ?? 0;
    const xj = polygon[j]?.longitude ?? 0;
    const yj = polygon[j]?.latitude ?? 0;
    if (onSegment(longitude, latitude, xi, yi, xj, yj)) return true;
    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Split a polyline into its contiguous in-region runs. Empty boundary
 * fails open (returns the whole line) so an unloaded region never blanks
 * the map.
 */
export function clipPolylineToPolygon(
  points: Coordinate[],
  polygon: Coordinate[]
): Coordinate[][] {
  if (polygon.length === 0) return points.length > 0 ? [points] : [];
  const segments: Coordinate[][] = [];
  let current: Coordinate[] = [];
  for (const p of points) {
    if (pointInPolygon(p.latitude, p.longitude, polygon)) {
      current.push(p);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

interface GatewayLineLike {
  mode: TransitMode;
  polylineCoordinates: Coordinate[];
}

/** Drawable segments for a line: clipped when gateway, whole otherwise. */
export function gatewayVisibleSegments(
  line: GatewayLineLike,
  boundary: Coordinate[]
): Coordinate[][] {
  if (!isGatewayMode(line.mode)) return line.polylineCoordinates.length > 0 ? [line.polylineCoordinates] : [];
  return clipPolylineToPolygon(line.polylineCoordinates, boundary);
}

/** Gateway vehicles show only while inside the active region boundary. */
export function isVehicleVisibleInRegion(
  vehicle: { mode: TransitMode; currentLatitude: number; currentLongitude: number },
  boundary: Coordinate[]
): boolean {
  if (!isGatewayMode(vehicle.mode)) return true;
  if (boundary.length === 0) return true;
  return pointInPolygon(vehicle.currentLatitude, vehicle.currentLongitude, boundary);
}
