/**
 * RED: one panel at a time — the check-in modal must layer ABOVE the
 * still-open feed drawer (drawer z-500), with the backdrop dimming it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import Home from "@/app/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
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

describe("crowd layering", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: [],
      allStops: [],
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: null,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("/api/crowdsource/feed")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ feed: [] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "/", "");
  });

  it("modal backdrop layers above the feed drawer", async () => {
    render(<Home />);
    await screen.findByTestId("compact-topbar");
    fireEvent.click(screen.getByRole("button", { name: "Report Crowd Level" }));
    const drawer = await screen.findByRole("dialog", {
      name: "Community Live Feed & Reports",
    });
    expect(drawer.className).toMatch(/z-\[500\]/);
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Vehicle Check-In Report" })
    );
    const modal = await screen.findByRole("dialog", {
      name: /Vehicle Check-In Report/,
    });
    const backdrop = modal.parentElement as HTMLElement;
    expect(backdrop.className).toMatch(/z-\[600\]/);
  });
});
