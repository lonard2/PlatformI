/**
 * RED: country-grouped region picker — the chrome shows the active region,
 * groups options under country headings, and switching recenters the map
 * while clearing cross-region selection and journey state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RegionPicker } from "@/components/navigation/RegionPicker";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

const REGIONS = [
  { id: "reg-jabodetabek-01", code: "JABODETABEK", name: "DKI Jakarta & Greater Jabodetabek", countryCode: "ID", centerLatitude: -6.2088, centerLongitude: 106.8456, zoomLevel: 12, boundaryCoordinates: [], lineCount: 59 },
  { id: "reg-surabaya-01", code: "SBY", name: "Surabaya (Gerbangkertosusila)", countryCode: "ID", centerLatitude: -7.25, centerLongitude: 112.75, zoomLevel: 11, boundaryCoordinates: [], lineCount: 0 },
];

function stubRegions(): void {
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

describe("region picker", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
      selectedStopId: "stop-test-picked",
      plannedJourney: {
        originStop: TRANSIT_STOPS[0],
        destinationStop: TRANSIT_STOPS[1],
        directLines: [],
        candidateLines: [],
        distanceKm: 1,
        estimatedFareRp: 3000,
        estimatedDurationMinutes: 10,
      } as never,
    });
    stubRegions();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the active region and groups options by country", async () => {
    render(<RegionPicker variant="full" />);
    expect(await screen.findByText("JABODETABEK")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /service region/i }));
    const sheet = await screen.findByRole("dialog", { name: /service region/i });
    expect(within(sheet).getByText("Indonesia")).toBeInTheDocument();
    expect(within(sheet).getByText(/Surabaya/)).toBeInTheDocument();
  });

  it("switching recenters the map and clears cross-region state", async () => {
    render(<RegionPicker variant="full" />);
    fireEvent.click(screen.getByRole("button", { name: /service region/i }));
    const sheet = await screen.findByRole("dialog", { name: /service region/i });
    fireEvent.click(within(sheet).getByRole("button", { name: /surabaya/i }));
    expect(useRegionStore.getState().activeRegionId).toBe("reg-surabaya-01");
    expect(useTransitStore.getState().viewportCenter).toEqual([-7.25, 112.75]);
    expect(useTransitStore.getState().viewportZoom).toBe(11);
    expect(useTransitStore.getState().selectedStopId).toBeNull();
    expect(useTransitStore.getState().plannedJourney).toBeNull();
  });
});
