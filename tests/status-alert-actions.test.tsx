/**
 * RED: per-alert actions — every disrupted alert card offers View on map
 * and Plan alternate (closes the drawer, opens the journey panel prefilled
 * with the affected stop), instead of dead-end copy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));
vi.mock("@/components/navigation/TransportationSystemBar", () => ({
  TransportationSystemBar: () => <div data-testid="tsb-stub" />,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

const JAKARTA_ALERT = {
  id: "alert-plan-1",
  lineId: TRANSIT_LINES[0].id,
  title: "Signal fault near Blok M",
  description: "Single-track working",
  severity: "WARNING",
  status: "ACTIVE",
  affectedStops: ["Blok M"],
  startTime: new Date().toISOString(),
  estimatedEndTime: null,
};

function stubApi(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/alerts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [JAKARTA_ALERT] }),
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
  useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
    activeAlerts: [JAKARTA_ALERT as never],
    alertsSyncedAt: Date.now(),
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
}

describe("alert card actions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedBoard();
    stubApi();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("view on map selects the line and closes the drawer", async () => {
    const onClose = vi.fn();
    render(<ServiceStatusDrawer isOpen onClose={onClose} />);
    const lineBtn = await screen.findByRole("button", { name: /Ratangga/ });
    fireEvent.click(lineBtn);
    const viewBtn = await screen.findByRole("button", { name: /track on map/i });
    fireEvent.click(viewBtn);
    expect(useTransitStore.getState().selectedLineId).toBe(TRANSIT_LINES[0].id);
    expect(onClose).toHaveBeenCalled();
  });

  it("plan alternate opens the journey panel prefilled", async () => {
    render(<Home />);
    await screen.findByTestId("compact-topbar");
    const statusBtns = screen.getAllByRole("button", { name: /service status/i });
    fireEvent.click(statusBtns[0]);
    const lineBtn = await screen.findByRole("button", { name: /Ratangga/ });
    fireEvent.click(lineBtn);
    const planBtn = await screen.findByRole("button", { name: /plan alternate/i });
    fireEvent.click(planBtn);
    const origin = await screen.findByPlaceholderText("Origin");
    expect((origin as HTMLInputElement).value).toMatch(/Blok M/i);
  });
});
