/**
 * RED: picker chrome stacking — the desktop header and the mobile compact
 * bar must stack strictly above the transport bar, otherwise the open
 * region sheet paints half-hidden underneath it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));

function zOf(className: string): number | null {
  const m = className.match(/(?:^|\s)z-(\d+)(?:\s|$)/);
  return m ? parseInt(m[1], 10) : null;
}

describe("picker chrome stacking", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      activeAlerts: [],
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("stacks both headers above the transport bar", async () => {
    const { container, unmount } = render(<Home />);
    const desktopHeader = container.querySelector("header.hidden");
    expect(desktopHeader).not.toBeNull();
    const mobileBar = await screen.findByTestId("compact-topbar");
    const headerZ = Math.max(
      zOf((desktopHeader as HTMLElement).className) ?? 0,
      zOf(mobileBar.className) ?? 0
    );
    unmount();

    const bar = render(<TransportationSystemBar />);
    const barRoot = bar.container.firstChild as HTMLElement;
    const barZ = zOf(barRoot.className) ?? 0;
    bar.unmount();

    expect(headerZ).toBeGreaterThan(barZ);
  });
});
