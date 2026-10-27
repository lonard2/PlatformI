/**
 * RED: service-status region parity — drawer, banner, and header badge show
 * only the active region's lines and alerts. An empty region gets an honest
 * empty note instead of Jakarta's calendar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { DisruptionAlertBanner } from "@/components/alerts/DisruptionAlertBanner";
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
  id: "alert-jkt-1",
  lineId: TRANSIT_LINES[0].id,
  title: "Jakarta corridor disruption",
  description: "Signal fault near Blok M",
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

describe("status region parity", () => {
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

  it("drawer shows the honest empty-region note outside Jabodetabek", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    expect(await screen.findByText(/no service status for this region/i)).toBeInTheDocument();
    expect(screen.queryByText("Live Status")).toBeNull();
    expect(screen.queryByText("Jakarta corridor disruption")).toBeNull();
  });

  it("drawer still shows Jakarta data in the home region", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    expect(await screen.findByText("Live Status")).toBeInTheDocument();
  });

  it("banner hides Jakarta alerts outside Jabodetabek", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    const { container } = render(<DisruptionAlertBanner onOpenStatusDrawer={() => {}} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(container.querySelector('[aria-label="Service Status"]')).toBeNull();
    expect(screen.queryByText("Jakarta corridor disruption")).toBeNull();
  });

  it("header badge hides Jakarta alerts outside Jabodetabek", async () => {
    useRegionStore.setState({ activeRegionId: "reg-surabaya-01" });
    render(<Home />);
    await screen.findByTestId("compact-topbar");
    expect(screen.queryAllByRole("status", { name: /active service alerts/i })).toHaveLength(0);
  });

  it("header badge still counts Jakarta alerts at home", async () => {
    render(<Home />);
    await screen.findByTestId("compact-topbar");
    expect(await screen.findAllByRole("status", { name: /active service alerts/i })).not.toHaveLength(0);
  });
});
