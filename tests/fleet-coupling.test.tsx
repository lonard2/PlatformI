/**
 * PlatformI - Fleet status/speed coupling visibility tests.
 * The automation states itself where the decision happens: affected rows
 * carry the coupling note, the telemetry modal shows a callout, and no
 * fine-print footnote remains under the table.
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

const HELD: Vehicle = { ...TRANSIT_VEHICLES[0], status: "CONGESTION_HOLD", speedKmh: 0 };
const MOVING: Vehicle = { ...TRANSIT_VEHICLES[1], status: "IN_SERVICE", speedKmh: 50 };

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Coupling visibility", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: [HELD, MOVING],
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

  it("states the coupling on affected rows, not on moving ones", async () => {
    render(<AdminFleetPage />);
    const heldCell = (await screen.findByText(HELD.vehicleCode)).closest("tr") as HTMLElement;
    expect(within(heldCell).getByText(/Speed → 0/)).toBeInTheDocument();
    const movingCell = await screen.findByText(MOVING.vehicleCode);
    const movingRow = movingCell.closest("tr") as HTMLElement;
    expect(within(movingRow).queryByText(/Speed → 0/)).not.toBeInTheDocument();
  });

  it("shows the coupling as a callout in the telemetry modal", async () => {
    render(<AdminFleetPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: new RegExp(`View telemetry for ${HELD.vehicleCode}`) })
    );
    const callout = await screen.findByTestId("status-coupling-callout");
    expect(callout.textContent).toMatch(/zeroes speed/);
    expect(callout.className).toMatch(/border-amber/);
  });

  it("keeps no fine-print footnote under the table", async () => {
    render(<AdminFleetPage />);
    await screen.findByText(HELD.vehicleCode);
    expect(
      screen.queryByText(/Returning to service restores 40 km\/h/)
    ).not.toBeInTheDocument();
  });
});
