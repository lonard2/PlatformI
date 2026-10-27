/**
 * RED: trend chart data-ink — every bar carries its own value, a visible
 * 98% target gridline anchors the axis, and the chart sits below the
 * per-mode reliability list instead of above it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

describe("trend data ink", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: Date.now(),
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
  });

  async function openUptime(): Promise<HTMLElement> {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    const uptimeTab = within(dialog).getByRole("tab", { name: /reliability/i });
    fireEvent.click(uptimeTab);
    return dialog;
  }

  it("prints each bar value and a 98% target line", async () => {
    const dialog = await openUptime();
    const chart = within(dialog).getByTestId("uptime-trend-chart");
    const values = within(chart).getAllByText(/^\d{2}\.\d%$/);
    expect(values.length).toBeGreaterThanOrEqual(10);
    expect(within(chart).getByText("98%")).toBeInTheDocument();
  });

  it("lists per-mode reliability before the trend chart", async () => {
    const dialog = await openUptime();
    const modeHeading = await within(dialog).findByText(/reliability breakdown/i);
    const chart = within(dialog).getByTestId("uptime-trend-chart");
    expect(
      modeHeading.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
