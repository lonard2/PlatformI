/**
 * RED: settings affordance — the gear gets a hover title and a visible
 * label at wide breakpoints instead of icon-only mystery.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

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

describe("settings affordance", () => {
  it("names the gear on hover and labels it at wide breakpoints", async () => {
    render(<Home />);
    const banner = await screen.findByRole("banner");
    const gear = within(banner).getByRole("button", { name: /settings & display/i });
    expect(gear).toHaveAttribute("title", "Settings & Display");
    const label = within(gear as HTMLElement).getByText("Settings & Display");
    expect(label.className).toMatch(/lg:inline/);
    expect(gear.className).toMatch(/min-h-\[44px\]/);
  });
});
