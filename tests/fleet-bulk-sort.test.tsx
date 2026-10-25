/**
 * PlatformI - Fleet bulk operations and sorting tests.
 * Corridor holds touch many vehicles at once: row checkboxes plus a bulk
 * status/crowd bar, and sorting by code/line/speed/status.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Fleet bulk operations", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
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

  it("selecting rows reveals a bulk bar with the selection count", async () => {    render(<AdminFleetPage />);
    const firstBox = await screen.findByRole("checkbox", {
      name: new RegExp(`Select ${TRANSIT_VEHICLES[0].vehicleCode}`),
    });
    fireEvent.click(firstBox);
    expect(await screen.findByText(/1 selected/i)).toBeInTheDocument();
  });

  it("bulk status change applies to every selected vehicle after confirm", async () => {
    render(<AdminFleetPage />);
    const boxA = await screen.findByRole("checkbox", {
      name: new RegExp(`Select ${TRANSIT_VEHICLES[0].vehicleCode}`),
    });
    const boxB = await screen.findByRole("checkbox", {
      name: new RegExp(`Select ${TRANSIT_VEHICLES[1].vehicleCode}`),
    });
    fireEvent.click(boxA);
    fireEvent.click(boxB);
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    const statusSelect = within(bulkBar).getByLabelText(/bulk status/i);
    fireEvent.change(statusSelect, { target: { value: "CONGESTION_HOLD" } });
    // Confirm gate: nothing moves until the operator applies it.
    fireEvent.click(await screen.findByRole("button", { name: /^apply$/i }));
    const state = useTransitStore.getState().simulatedVehicles;
    const a = state.find((v) => v.id === TRANSIT_VEHICLES[0].id);
    const b = state.find((v) => v.id === TRANSIT_VEHICLES[1].id);
    expect(a?.status).toBe("CONGESTION_HOLD");
    expect(b?.status).toBe("CONGESTION_HOLD");
  });

  it("sorts the board by code when the sort control changes", async () => {
    render(<AdminFleetPage />);
    const sortSelect = await screen.findByLabelText(/sort fleet/i);
    fireEvent.change(sortSelect, { target: { value: "code-desc" } });
    const rows = screen.getAllByRole("checkbox", { name: /select /i });
    // Header select-all first; first data row should be the highest code.
    const codes = TRANSIT_VEHICLES.slice(0, 8)
      .map((v) => v.vehicleCode)
      .sort()
      .reverse();
    expect(rows[1].getAttribute("aria-label")).toContain(codes[0]);
  });

  it("exposes the board table under an accessible caption", async () => {
    render(<AdminFleetPage />);
    expect(await screen.findByRole("table", { name: /fleet inventory board/i })).toBeInTheDocument();
  });
});
