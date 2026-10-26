/**
 * RED: homepage harden — fare unknown states the path forward and carries
 * the route into the pass wallet purchase flow.
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

describe("homepage fare honesty", () => {
  it("states fare-to-confirm with a reason instead of a bare dash", async () => {
    window.history.replaceState(
      null,
      "",
      `/?from=${encodeURIComponent("Term. Tj. Priok 2")}&to=${encodeURIComponent("Telkom Tj. Priok")}`
    );
    render(<Home />);
    expect(await screen.findByText("Fare to confirm")).toBeInTheDocument();
    expect(screen.getByText(/varies by operator/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check pass options/i })).toBeInTheDocument();
  });

  it("carries the route into the wallet purchase flow", async () => {
    window.history.replaceState(
      null,
      "",
      `/?from=${encodeURIComponent("Term. Tj. Priok 2")}&to=${encodeURIComponent("Telkom Tj. Priok")}`
    );
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: /check pass options/i }));
    const drawer = await screen.findByRole("dialog", { name: /tickets/i });
    expect(within(drawer).getByRole("heading", { name: /purchase transit pass/i })).toBeInTheDocument();
    expect(within(drawer).getAllByText(/Term\. Tj\. Priok 2/).length).toBeGreaterThan(0);
    expect(within(drawer).getAllByText(/Telkom Tj\. Priok/).length).toBeGreaterThan(0);
  });
});
