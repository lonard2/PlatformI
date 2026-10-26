/**
 * Wilayah (administrative region) derivation for Jakarta service areas.
 *
 * The heuristic anchors on Monas (-6.175, 106.827): the Thousand Islands
 * sit north of the coastline, the rest split into quadrants. It is a
 * backfill default for seed data and API payloads that omit wilayah —
 * authors can always override it from the network studio dropdown.
 */
import type { WilayahCode } from "@/types/transit";

const MONAS_LAT = -6.175;
const MONAS_LNG = 106.827;
const COAST_LAT = -6.05;
const UTARA_LAT = -6.15;
const TIMUR_LNG = 106.86;
const BARAT_LNG = 106.79;
const PUSAT_HALF_SPAN = 0.035;

export const WILAYAH_CODES: WilayahCode[] = [
  "PUSAT",
  "UTARA",
  "TIMUR",
  "SELATAN",
  "BARAT",
  "KEPULAUAN_SERIBU",
];

export function wilayahForCoordinate(latitude: number, longitude: number): WilayahCode {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "PUSAT";
  // Thousand Islands: north of the Java Sea coastline.
  if (latitude > COAST_LAT) return "KEPULAUAN_SERIBU";
  // Northern strip (port, Ancol, Kelapa Gading) reads as Utara even in the east.
  if (latitude > UTARA_LAT) return "UTARA";
  if (longitude >= TIMUR_LNG) return "TIMUR";
  if (longitude <= BARAT_LNG) return "BARAT";
  if (latitude > MONAS_LAT) return "UTARA";
  if (
    Math.abs(latitude - MONAS_LAT) <= PUSAT_HALF_SPAN &&
    Math.abs(longitude - MONAS_LNG) <= PUSAT_HALF_SPAN
  ) {
    return "PUSAT";
  }
  return "SELATAN";
}

/**
 * Corridor wilayah: unanimous stop regions win; a split corridor or an
 * empty stop list yields null (spans multiple regions / unassigned)
 * instead of a misleading single label.
 */
export function wilayahForStops(
  stops: Array<{ latitude: number; longitude: number }>
): WilayahCode | null {
  if (stops.length === 0) return null;
  const counts = new Map<WilayahCode, number>();
  for (const s of stops) {
    const w = wilayahForCoordinate(s.latitude, s.longitude);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  let best: WilayahCode | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [w, n] of counts) {
    if (n > bestCount) {
      best = w;
      bestCount = n;
      tied = false;
    } else if (n === bestCount) {
      tied = true;
    }
  }
  return tied ? null : best;
}
