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
import { useMemo } from "react";
import type { Line, Region, Stop, Vehicle } from "@/types/transit";
import { useTransitStore } from "./useTransitStore";

export const JABODETABEK_REGION_ID = "reg-jabodetabek-01";

interface RegionStoreState {
  activeRegionId: string | null;
  setActiveRegion: (regionId: string | null) => void;
  regions: Array<Region & { lineCount?: number }>;
  regionsLoaded: boolean;
  loadRegions: () => Promise<void>;
}

export const useRegionStore = create<RegionStoreState>()(
  persist(
    (set, get) => ({
      activeRegionId: JABODETABEK_REGION_ID,
      setActiveRegion: (regionId) => set({ activeRegionId: regionId }),
      regions: [],
      regionsLoaded: false,
      loadRegions: async () => {
        if (get().regionsLoaded) return;
        try {
          const res = await fetch("/api/network/regions");
          const json = await res.json();
          if (res.ok && json.success && Array.isArray(json.data)) {
            set({ regions: json.data, regionsLoaded: true });
          }
        } catch {
          // Fail-open: layers render unclipped until regions arrive.
        }
      },
    }),
    {
      name: "platformi-region",
      partialize: (state) => ({ activeRegionId: state.activeRegionId }),
    }
  )
);

/** The active region record, once the region list has loaded. */
export function useActiveRegion(): Region | undefined {
  const regions = useRegionStore((s) => s.regions);
  const activeRegionId = useRegionStore((s) => s.activeRegionId);
  return useMemo(
    () => regions.find((r) => r.id === activeRegionId),
    [regions, activeRegionId]
  );
}

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
export function linesInRegion<T extends { regionId: string; regionIds?: string[] | null }>(
  lines: T[],
  regionId: string | null | undefined
): T[] {
  if (!regionId) return lines;
  return lines.filter((l) => l.regionId === regionId || (l.regionIds ?? []).includes(regionId));
}

/** Stops served by the given (already region-filtered) lines. */
export function stopsInRegion<T extends { lineId: string }, L extends { id: string }>(
  stops: T[],
  lines: L[]
): T[] {
  const lineIds = new Set(lines.map((l) => l.id));
  return stops.filter((s) => lineIds.has(s.lineId));
}

/** Region-scoped live lists for map layers, planner inputs, and boards. */
export function useActiveLines(): Line[] {
  const allLines = useTransitStore((s) => s.allLines);
  const regionId = useRegionStore((s) => s.activeRegionId);
  return useMemo(() => linesInRegion(allLines, regionId), [allLines, regionId]);
}

export function useActiveStops(): Stop[] {
  const allStops = useTransitStore((s) => s.allStops);
  const activeLines = useActiveLines();
  return useMemo(() => stopsInRegion(allStops, activeLines), [allStops, activeLines]);
}

export function useActiveVehicles(): Vehicle[] {
  const vehicles = useTransitStore((s) => s.simulatedVehicles);
  const activeLines = useActiveLines();
  return useMemo(() => {
    const lineIds = new Set(activeLines.map((l) => l.id));
    return vehicles.filter((v) => lineIds.has(v.lineId));
  }, [vehicles, activeLines]);
}
