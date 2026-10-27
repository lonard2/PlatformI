/**
 * RED: active-region scoping — map layers, journey planner inputs, and the
 * network studio follow the active region. A Jakarta stop is unroutable
 * from Surabaya, and the Surabaya studio board starts empty.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { stopsInRegion, linesInRegion } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Stop } from "@/types/transit";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));

vi.mock("@/components/navigation/TransportationSystemBar", () => ({
  TransportationSystemBar: () => <div data-testid="tsb-stub" />,
}));

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

const REGIONS = [
  { id: "reg-jabodetabek-01", code: "JABODETABEK", name: "DKI Jakarta & Greater Jabodetabek", countryCode: "ID", centerLatitude: -6.2088, centerLongitude: 106.8456, zoomLevel: 12, boundaryCoordinates: [], lineCount: 59 },
  { id: "reg-surabaya-01", code: "SBY", name: "Surabaya (Gerbangkertosusila)", countryCode: "ID", centerLatitude: -7.25, centerLongitude: 112.75, zoomLevel: 11, boundaryCoordinates: [], lineCount: 0 },
];

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/regions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: REGIONS }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

function seedBoard(): void {
  useLanguageStore.setState({ language: "en" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
    activeAlerts: [],
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
}

describe("region scoping", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedBoard();
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("filters stops to the active region's lines", () => {
    const stops = [
      { id: "s1", lineId: "line-mrt-ns" },
      { id: "s2", lineId: "line-sby-1" },
    ] as Stop[];
    const lines = [
      { id: "line-mrt-ns", regionId: "reg-jabodetabek-01" },
      { id: "line-sby-1", regionId: "reg-surabaya-01" },
    ] as Array<{ id: string; regionId: string }>;
    const surabayaLines = linesInRegion(lines, "reg-surabaya-01");
    expect(stopsInRegion(stops, surabayaLines).map((s) => s.id)).toEqual(["s2"]);
  });

  it("hides Jakarta suggestions when Surabaya is active", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: /find route/i }));
    fireEvent.change(await screen.findByPlaceholderText("Origin"), { target: { value: "Blok M" } });
    expect(screen.queryByRole("option", { name: /blok m/i })).toBeNull();
  });

  it("shows Jakarta suggestions in the home region", async () => {
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: /find route/i }));
    fireEvent.change(await screen.findByPlaceholderText("Origin"), { target: { value: "Blok M" } });
    expect(await screen.findAllByRole("option", { name: /blok m/i })).not.toHaveLength(0);
  });

  it("starts the studio board empty outside Jabodetabek", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<AdminNetworkStudioPage />);
    expect(await screen.findByText("No lines match this filter.")).toBeInTheDocument();
  });
});
