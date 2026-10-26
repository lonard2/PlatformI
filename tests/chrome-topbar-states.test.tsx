/**
 * RED: top-bar active coherence — one visual recipe plus aria-pressed
 * on all five toggles.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
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

const TOGGLES: Array<[string, RegExp]> = [
  ["alerts", /service status/i],
  ["ai", /ai travel assistant/i],
  ["crowdsource", /report crowd level/i],
  ["tickets", /tickets & jaklingko/i],
  ["settings", /settings & display/i],
];

describe("top-bar active coherence", () => {
  it.each(TOGGLES)("marks %s open with the shared active recipe", async (drawer, name) => {
    useTransitStore.setState({ activeDrawer: drawer as never });
    render(<Home />);
    const btn = await screen.findByRole("button", { name });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn.className).toMatch(/bg-cyan-950\/80/);
  });

  it("leaves closed toggles unpressed and neutral", async () => {
    useTransitStore.setState({ activeDrawer: "alerts" });
    render(<Home />);
    const ai = await screen.findByRole("button", { name: /ai travel assistant/i });
    expect(ai).toHaveAttribute("aria-pressed", "false");
    expect(ai.className).not.toMatch(/bg-cyan-950\/80/);
  });
});
