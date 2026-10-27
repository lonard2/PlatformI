/**
 * PlatformI - Active Region Store
 *
 * Holds the traveller's selected service region (default Jabodetabek),
 * persisted across sessions. Scoping helpers keep map, planner, and studio
 * views on the active region's lines without touching the raw dataset.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Line, Region } from "@/types/transit";

export const JABODETABEK_REGION_ID = "reg-jabodetabek-01";

interface RegionStoreState {
  activeRegionId: string | null;
  setActiveRegion: (regionId: string | null) => void;
}

export const useRegionStore = create<RegionStoreState>()(
  persist(
    (set) => ({
      activeRegionId: JABODETABEK_REGION_ID,
      setActiveRegion: (regionId) => set({ activeRegionId: regionId }),
    }),
    { name: "platformi-region" }
  )
);

export interface CountryRegionGroup {
  countryCode: string;
  regions: Region[];
}

/** Groups regions under country headings for the picker, ID first. */
export function groupRegionsByCountry(regions: Region[]): CountryRegionGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, Region[]>();
  for (const r of regions) {
    const code = r.countryCode || "ID";
    if (!buckets.has(code)) {
      buckets.set(code, []);
      order.push(code);
    }
    buckets.get(code)?.push({ ...r, countryCode: code });
  }
  order.sort((a, b) => (a === "ID" ? -1 : b === "ID" ? 1 : a.localeCompare(b)));
  return order.map((countryCode) => ({
    countryCode,
    regions: (buckets.get(countryCode) ?? []).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    ),
  }));
}

/** Lines of one region; null/undefined regionId means the unfiltered network. */
export function linesInRegion<T extends { regionId: string }>(
  lines: T[],
  regionId: string | null | undefined
): T[] {
  if (!regionId) return lines;
  return lines.filter((l) => l.regionId === regionId);
}
