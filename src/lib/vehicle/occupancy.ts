/**
 * PlatformI - Shared occupancy scale (bus, rail, maritime, aviation).
 *
 * One threshold table for every occupancy readout so color always ships
 * with a numeric range and a text label — never color-alone. Labels reuse
 * the existing t.common crowd keys; ranges are contiguous over 0-100.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

export type OccupancyLabelKey =
  | "seatsAvailable"
  | "fewSeats"
  | "standingOnly"
  | "fullCrowded";

export interface OccupancyBand {
  min: number;
  max: number;
  labelKey: OccupancyLabelKey;
  bg: string;
  text: string;
  border: string;
  lightBg: string;
  hex: string;
}

export const OCCUPANCY_BANDS: OccupancyBand[] = [
  {
    min: 0,
    max: 49,
    labelKey: "seatsAvailable",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    lightBg: "bg-emerald-950/40",
    hex: "#10b981",
  },
  {
    min: 50,
    max: 74,
    labelKey: "fewSeats",
    bg: "bg-cyan-500",
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    lightBg: "bg-cyan-950/40",
    hex: "#06b6d4",
  },
  {
    min: 75,
    max: 89,
    labelKey: "standingOnly",
    bg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/40",
    lightBg: "bg-amber-950/40",
    hex: "#f59e0b",
  },
  {
    min: 90,
    max: 100,
    labelKey: "fullCrowded",
    bg: "bg-rose-500",
    text: "text-rose-400",
    border: "border-rose-500/40",
    lightBg: "bg-rose-950/40",
    hex: "#f43f5e",
  },
];

/** Band for a 0-100 occupancy percentage (clamped). */
export function getOccupancyBand(percent: number): OccupancyBand {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    OCCUPANCY_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ??
    OCCUPANCY_BANDS[OCCUPANCY_BANDS.length - 1]
  );
}

/** Drop-in styling helper preserving the historical return shape. */
export function getOccupancyColor(percent: number): OccupancyBand {
  return getOccupancyBand(percent);
}
