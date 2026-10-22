/**
 * PlatformI - Jabodetabek region box and inside check.
 * Single source of truth for the live-map culling box; Task 2 consumes
 * `isInsideJabodetabek` to keep Leaflet markers interior-only while
 * intercity trips outside the box render on the schematic line.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import { JABODEBEK_BOUNDS } from "@/lib/constants/modes";

export type { JabodetabekBounds } from "@/lib/constants/modes";
export { JABODEBEK_BOUNDS };

/**
 * Returns true when the coordinate lies inside the Jabodetabek box.
 * Edges are inclusive so vehicles exactly on the boundary render stably
 * instead of flickering between map dot and schematic-only.
 */
export function isInsideJabodetabek(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return (
    lat >= JABODEBEK_BOUNDS.minLat &&
    lat <= JABODEBEK_BOUNDS.maxLat &&
    lng >= JABODEBEK_BOUNDS.minLng &&
    lng <= JABODEBEK_BOUNDS.maxLng
  );
}
