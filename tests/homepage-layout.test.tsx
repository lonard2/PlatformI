/**
 * RED: homepage layout — expanded journey opens as a top sheet on mobile
 * with headroom for the map, instead of a bottom-3 slab over the nav.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/timetables")) return okJson([]);
      return okJson([]);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("homepage journey sheet", () => {
  it("docks the expanded journey to the top with map headroom on mobile", async () => {
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: /find route/i }));
    const dialog = await screen.findByRole("dialog", { name: /find route/i });
    const wrap = dialog.parentElement as HTMLElement;
    expect(wrap.className).toMatch(/(^|\s)top-3(\s|$)/);
    expect(wrap.className).not.toMatch(/(^|\s)bottom-3(\s|$)/);
    expect(dialog.className).toMatch(/max-h-\[55vh\]/);
  });
});
