/**
 * RED: region gating — the transport bar catalog follows the active region
 * (legacy Jakarta items hide outside Jabodetabek with an honest empty note),
 * and the fleet + alerts boards filter to the active region's lines.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransportationSystemBar, itemVisibleInRegion } from "@/components/navigation/TransportationSystemBar";
import AdminFleetPage from "@/app/admin/fleet/page";
import AdminAlertsPage from "@/app/admin/alerts/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS, TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { TransitSystemItem } from "@/components/navigation/TransportationSystemBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

const SEEDED_ALERT = {
  id: "alert-region-1",
  lineId: TRANSIT_LINES[0].id,
  title: "Jakarta Flood Diversion",
  description: "Counterflow on corridor 1",
  severity: "WARNING",
  status: "ACTIVE",
  affectedStops: [],
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
          json: async () => ({ success: true, data: [SEEDED_ALERT] }),
        } as Response);
      }
      if (String(url).includes("/api/crowdsource/feed")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, feed: [] }),
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
    simulatedVehicles: [{ ...TRANSIT_VEHICLES[0] }],
    activeAlerts: [],
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
}

describe("region gating", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    seedBoard();
    stubApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats unregioned legacy items as Jabodetabek-only", () => {
    const item = { id: "x", corridorsOrBuildings: [] } as unknown as TransitSystemItem;
    expect(itemVisibleInRegion(item, "reg-jabodetabek-01")).toBe(true);
    expect(itemVisibleInRegion(item, "reg-surabaya-01")).toBe(false);
    expect(itemVisibleInRegion(item, null)).toBe(true);
    const tagged = {
      ...item,
      regionIds: ["reg-surabaya-01"],
    } as unknown as TransitSystemItem;
    expect(itemVisibleInRegion(tagged, "reg-surabaya-01")).toBe(true);
    expect(itemVisibleInRegion(tagged, "reg-jabodetabek-01")).toBe(false);
  });

  it("hides the Jakarta catalog outside Jabodetabek with an empty note", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<TransportationSystemBar />);
    expect(screen.queryByRole("button", { name: /mikrotrans/i })).toBeNull();
    expect(
      await screen.findByText(/no corridors (published )?in this region/i)
    ).toBeInTheDocument();
  });

  it("shows the Jakarta catalog in the home region", async () => {
    render(<TransportationSystemBar />);
    expect(await screen.findByRole("button", { name: /mikrotrans/i })).toBeInTheDocument();
  });

  it("filters the fleet board to the active region", async () => {
    const code = TRANSIT_VEHICLES[0].vehicleCode;
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<AdminFleetPage />);
    await screen.findByTestId("occ-community-feed");
    expect(screen.queryByText(code)).toBeNull();
  });

  it("filters the alerts board to the active region", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<AdminAlertsPage />);
    expect(await screen.findAllByText(/active service disruptions/i)).not.toHaveLength(0);
    expect(screen.queryByText("Jakarta Flood Diversion")).toBeNull();
  });
});
