/**
 * RED: compact mobile top bar — brand mini, alerts badge, tickets,
 * and an overflow sheet; crowdsource gate drops to sm.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import Home from "@/app/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { DisruptionAlert } from "@/types/transit";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));

vi.mock("@/components/navigation/TransportationSystemBar", () => ({
  TransportationSystemBar: () => <div data-testid="tsb-stub" />,
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response);
}

function warnAlert(id: string): DisruptionAlert {
  return {
    id,
    lineId: "line-mrt-ns",
    title: "Slowdown",
    description: "Minor",
    severity: "WARNING",
    status: "ACTIVE",
    affectedStops: [],
    startTime: new Date().toISOString(),
  };
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    activeAlerts: [],
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => okJson([]))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("compact mobile top bar", () => {
  it("renders brand mini, alerts badge, tickets, and overflow", async () => {
    useTransitStore.setState({ activeAlerts: [warnAlert("w1")] });
    render(<Home />);
    const bar = await screen.findByTestId("compact-topbar");
    expect(within(bar).getByText("PlatformI")).toBeInTheDocument();
    expect(within(bar).getByRole("status", { name: /1 active/i })).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole("button", { name: /tickets/i }));
    expect(useTransitStore.getState().activeDrawer).toBe("tickets");
  });

  it("opens crowdsource from the overflow sheet", async () => {
    render(<Home />);
    const bar = await screen.findByTestId("compact-topbar");
    fireEvent.click(within(bar).getByRole("button", { name: /^more$/i }));
    fireEvent.click(await within(bar).findByRole("button", { name: /report crowd level/i }));
    expect(useTransitStore.getState().activeDrawer).toBe("crowdsource");
  });

  it("gates desktop crowdsource at sm, not md", async () => {
    render(<Home />);
    const banner = await screen.findByRole("banner");
    const crowd = within(banner).getByRole("button", { name: /report crowd level/i });
    expect(crowd.className).toMatch(/sm:flex/);
    expect(crowd.className).not.toMatch(/md:flex/);
  });
});
