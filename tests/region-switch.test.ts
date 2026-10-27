/**
 * RED: multi-region foundation — six metro regions exist with country codes,
 * and a persisted active-region store with scoping helpers drives switching.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getRegions } from "@/app/api/network/regions/route";
import { useRegionStore, JABODETABEK_REGION_ID } from "@/lib/stores/useRegionStore";
import { linesInRegion, groupRegionsByCountry } from "@/lib/stores/useRegionStore";
import type { Line, Region } from "@/types/transit";

const METRO_IDS = [
  "reg-jabodetabek-01",
  "reg-surabaya-01",
  "reg-bandung-01",
  "reg-semarang-01",
  "reg-medan-01",
  "reg-makassar-01",
  "reg-denpasar-01",
  "reg-klangvalley-01",
  "reg-singapore-01",
  "reg-bangkok-01",
];

describe("multi-region foundation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useRegionStore.setState({ activeRegionId: JABODETABEK_REGION_ID });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("seeds seven Indonesian metro regions", async () => {
    const res = await getRegions();
    expect(res.status).toBe(200);
    const regions = ((await res.json()).data || []) as Array<Region & { lineCount: number }>;
    for (const id of METRO_IDS) {
      expect(regions.some((r) => r.id === id)).toBe(true);
    }
    const jabodetabek = regions.find((r) => r.id === "reg-jabodetabek-01");
    expect(jabodetabek?.countryCode).toBe("ID");
    expect(Number(jabodetabek?.lineCount)).toBeGreaterThan(0);
    const surabaya = regions.find((r) => r.id === "reg-surabaya-01");
    expect(surabaya?.lineCount).toBe(0);
  });

  it("defaults to Jabodetabek and persists switches", () => {
    expect(useRegionStore.getState().activeRegionId).toBe(JABODETABEK_REGION_ID);
    useRegionStore.getState().setActiveRegion("reg-surabaya-01");
    expect(useRegionStore.getState().activeRegionId).toBe("reg-surabaya-01");
    expect(window.localStorage.getItem("platformi-region")).toContain("reg-surabaya-01");
  });

  it("groups regions by country with Indonesia first", () => {
    const regions = [
      { id: "a", countryCode: "TH" },
      { id: "b", countryCode: "ID" },
      { id: "c", countryCode: "MY" },
    ] as Region[];
    const groups = groupRegionsByCountry(regions);
    expect(groups.map((g) => g.countryCode)).toEqual(["ID", "MY", "TH"]);
    expect(groups[0]?.regions.map((r) => r.id)).toEqual(["b"]);
  });

  it("filters lines by region, null means all", () => {
    const lines = [
      { id: "l1", regionId: "reg-jabodetabek-01" },
      { id: "l2", regionId: "reg-surabaya-01" },
    ] as Line[];
    expect(linesInRegion(lines, "reg-surabaya-01").map((l) => l.id)).toEqual(["l2"]);
    expect(linesInRegion(lines, null).map((l) => l.id)).toEqual(["l1", "l2"]);
  });
});
