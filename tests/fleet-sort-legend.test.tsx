/**
 * PlatformI - Fleet sort-by-need and color legend tests.
 * Triage sorts worst-first, and the two color scales that share amber
 * are labeled where the board is read.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

const HOLD: Vehicle = { ...TRANSIT_VEHICLES[2], status: "CONGESTION_HOLD", speedKmh: 0 };
const OUT: Vehicle = { ...TRANSIT_VEHICLES[0], status: "OUT_OF_SERVICE", speedKmh: 0 };
const BOARDING: Vehicle = { ...TRANSIT_VEHICLES[3], status: "BOARDING", speedKmh: 0 };
const IN_SERVICE: Vehicle = { ...TRANSIT_VEHICLES[1], status: "IN_SERVICE", speedKmh: 50 };

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Sort by operational need", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: [OUT, IN_SERVICE, HOLD, BOARDING],
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("orders holds before out-of-service before boarding before in-service", async () => {
    render(<AdminFleetPage />);
    const sortSelect = await screen.findByLabelText(/sort fleet/i);
    fireEvent.change(sortSelect, { target: { value: "status" } });
    const rows = screen.getAllByRole("checkbox", { name: /select /i });
    expect(rows[1].getAttribute("aria-label")).toContain(HOLD.vehicleCode);
    expect(rows[2].getAttribute("aria-label")).toContain(OUT.vehicleCode);
    expect(rows[3].getAttribute("aria-label")).toContain(BOARDING.vehicleCode);
    expect(rows[4].getAttribute("aria-label")).toContain(IN_SERVICE.vehicleCode);
  });
});

describe("Fleet color legend", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 4),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("labels both scales where the board is read", async () => {
    render(<AdminFleetPage />);
    const legend = await screen.findByTestId("fleet-legend");
    expect(within(legend).getByText("Congestion Hold / Standby")).toBeInTheDocument();
    expect(within(legend).getByText("Few Seats Remaining")).toBeInTheDocument();
    expect(within(legend).getByText("In Motion")).toBeInTheDocument();
  });
});
