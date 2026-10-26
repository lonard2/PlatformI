/**
 * RED: homepage polish — no focus steal on deep-link arrival, swap
 * target guarantee, live answer region.
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
    vi.fn().mockImplementation((url: string) => okJson([]))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("homepage polish", () => {
  it("does not steal focus on deep-link arrival", async () => {
    window.history.replaceState(
      null,
      "",
      `/?from=${encodeURIComponent("Stasiun Blok M BCA")}&to=${encodeURIComponent("Stasiun Dukuh Atas BNI")}`
    );
    render(<Home />);
    await screen.findByText("Direct Route");
    await new Promise((r) => setTimeout(r, 100));
    expect(document.activeElement === document.body).toBe(true);
  });

  it("keeps the swap control at touch-target size", async () => {
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: /find route/i }));
    const dialog = await screen.findByRole("dialog", { name: /find route/i });
    const swap = dialog.querySelectorAll("button")[1];
    expect(swap.className).toContain("touch-target");
  });

  it("announces the answer in a polite live region", async () => {
    window.history.replaceState(
      null,
      "",
      `/?from=${encodeURIComponent("Stasiun Blok M BCA")}&to=${encodeURIComponent("Stasiun Dukuh Atas BNI")}`
    );
    render(<Home />);
    await screen.findByText("Direct Route");
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent ?? "").toMatch(/direct route/i);
  });
});
