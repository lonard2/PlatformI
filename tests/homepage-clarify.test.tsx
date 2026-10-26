/**
 * RED: homepage clarify — Find Route label, pill status text, multi-leg
 * no-route CTA with AI provenance, secondary success CTA.
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

function seed(): void {
  useLanguageStore.getState().setLanguage("en");
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
    vi.fn().mockImplementation((url: string) => okJson([]))
  );
}

beforeEach(() => {
  seed();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function deepLink(from: string, to: string): void {
  window.history.replaceState(
    null,
    "",
    `/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

describe("homepage clarify", () => {
  it("keeps one Find Route label on the collapsed pill", async () => {
    render(<Home />);
    const pill = await screen.findByRole("button", { name: /find route/i });
    expect(pill).toBeInTheDocument();
    const { queryByText } = within(pill as HTMLElement);
    expect(queryByText(/^route$/i)).not.toBeInTheDocument();
  });

  it("states the route outcome as pill text", async () => {
    deepLink("Stasiun Blok M BCA", "Stasiun Dukuh Atas BNI");
    render(<Home />);
    await screen.findByText("Direct Route");
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(await screen.findByText(/direct route · ~\d+ min/i)).toBeInTheDocument();
  });

  it("offers multi-leg options with AI provenance when no route exists", async () => {
    deepLink("Term. Tj. Priok 2", "Stasiun Lebak Bulus Grab");
    render(<Home />);
    expect(await screen.findByRole("button", { name: /get multi-leg options/i })).toBeInTheDocument();
    expect(screen.getByText(/verify times before travel/i)).toBeInTheDocument();
  });

  it("demotes the success CTA to fare and transfer tips", async () => {
    deepLink("Stasiun Blok M BCA", "Stasiun Dukuh Atas BNI");
    render(<Home />);
    expect(await screen.findByRole("button", { name: /fare & transfer tips/i })).toBeInTheDocument();
    expect(screen.queryByText(/integrated tariff savings/i)).not.toBeInTheDocument();
  });
});
