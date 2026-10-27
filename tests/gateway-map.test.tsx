/**
 * RED: gateway map gating — gateway-mode vehicles outside the active region
 * are hidden, gateway polylines draw clipped segments, and the picker reads
 * the shared region store instead of its own fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RegionPicker } from "@/components/navigation/RegionPicker";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { useLanguageStore } from "@/lib/i18n";
import {
  isVehicleVisibleInRegion,
  gatewayVisibleSegments,
} from "@/lib/geodesy/regionClip";
import type { Coordinate } from "@/types/transit";

const JAKARTA_BOX: Coordinate[] = [
  { latitude: -6.08, longitude: 106.65 },
  { latitude: -6.08, longitude: 107.05 },
  { latitude: -6.42, longitude: 107.05 },
  { latitude: -6.42, longitude: 106.65 },
];

const REGIONS = [
  { id: "reg-jabodetabek-01", code: "JABODETABEK", name: "DKI Jakarta & Greater Jabodetabek", countryCode: "ID", centerLatitude: -6.2088, centerLongitude: 106.8456, zoomLevel: 12, boundaryCoordinates: [], lineCount: 59 },
  { id: "reg-surabaya-01", code: "SBY", name: "Surabaya (Gerbangkertosusila)", countryCode: "ID", centerLatitude: -7.25, centerLongitude: 112.75, zoomLevel: 11, boundaryCoordinates: [], lineCount: 0 },
];

describe("gateway map gating", () => {
  it("hides gateway vehicles outside the boundary but keeps network ones", () => {
    const kaiFar = { mode: "KAI_INTERCITY", currentLatitude: -7.26, currentLongitude: 112.75 } as never;
    const kaiHome = { mode: "KAI_INTERCITY", currentLatitude: -6.18, currentLongitude: 106.83 } as never;
    const krlFar = { mode: "KRL_BOGOR", currentLatitude: -6.59, currentLongitude: 106.79 } as never;
    expect(isVehicleVisibleInRegion(kaiFar, JAKARTA_BOX)).toBe(false);
    expect(isVehicleVisibleInRegion(kaiHome, JAKARTA_BOX)).toBe(true);
    expect(isVehicleVisibleInRegion(krlFar, JAKARTA_BOX)).toBe(true);
    expect(isVehicleVisibleInRegion(kaiFar, [])).toBe(true);
  });

  it("clips gateway polylines but passes corridors whole", () => {
    const tail: Coordinate[] = [
      { latitude: -6.21, longitude: 106.95 },
      { latitude: -6.91, longitude: 107.61 },
      { latitude: -7.8, longitude: 110.37 },
    ];
    const akap = { mode: "AKAP_INTERCITY_BUS", polylineCoordinates: tail } as never;
    const clipped = gatewayVisibleSegments(akap, JAKARTA_BOX);
    expect(clipped.length).toBe(1);
    expect(clipped[0]?.length).toBe(1);
    const krl = { mode: "KRL_BOGOR", polylineCoordinates: tail } as never;
    expect(gatewayVisibleSegments(krl, JAKARTA_BOX)).toEqual([tail]);
  });
});

describe("picker reads the shared region store", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({
      activeRegionId: "reg-jabodetabek-01",
      regions: REGIONS as never,
      regionsLoaded: true,
    });
    // The store already holds regions: no network needed.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline"))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists regions without fetching", async () => {
    const fetchSpy = vi.mocked(fetch);
    render(<RegionPicker variant="full" />);
    expect(await screen.findByText("JABODETABEK")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /service region/i }));
    const sheet = await screen.findByRole("dialog", { name: /service region/i });
    expect(within(sheet).getByText(/surabaya/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
