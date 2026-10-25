/**
 * PlatformI - Fleet coupling + add-defaults clarity tests.
 * Silent automations become visible: the status/speed coupling is stated
 * in-UI, and the add form shows a pre-submit summary with a live
 * duplicate-code warning that blocks save.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("Fleet coupling clarity", () => {
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

  it("states the status/speed coupling in the UI", async () => {
    render(<AdminFleetPage />);
    expect(await screen.findByText(/zeroes speed/i)).toBeInTheDocument();
  });

  it("shows a pre-submit summary in the add form", async () => {
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByRole("button", { name: /deploy vehicle/i }));
    expect(await screen.findByTestId("fleet-add-summary")).toBeInTheDocument();
  });

  it("warns on duplicate code and blocks save", async () => {
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByRole("button", { name: /deploy vehicle/i }));
    const codeInput = await screen.findByLabelText("Vehicle Code");
    fireEvent.change(codeInput, { target: { value: TRANSIT_VEHICLES[0].vehicleCode.toLowerCase() } });
    const nameInput = screen.getByLabelText("Vehicle Name / Model");
    fireEvent.change(nameInput, { target: { value: "Duplicate probe" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/already in the fleet/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });
});
