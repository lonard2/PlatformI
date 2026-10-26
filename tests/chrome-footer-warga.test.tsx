/**
 * RED: warga drawer dismiss — an explicit Tutup closes the crowdsource
 * drawer (Escape-only is undiscoverable and headless-unreliable).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
    activeDrawer: "crowdsource",
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

describe("warga drawer dismiss", () => {
  it("exposes an explicit close control on the crowdsource drawer", async () => {
    render(<Home />);
    const dialog = await screen.findByRole("dialog", { name: /community live/i });
    expect(within(dialog).getByRole("button", { name: /^close$/i })).toBeInTheDocument();
  });

  it("closes the drawer from the explicit control", async () => {
    render(<Home />);
    const dialog = await screen.findByRole("dialog", { name: /community live/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));
    expect(useTransitStore.getState().activeDrawer).toBeNull();
  });
});
