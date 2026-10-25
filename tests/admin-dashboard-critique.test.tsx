/**
 * PlatformI - OCC dashboard critique fixes.
 * The command surface operates: incident queue CTAs, deep-linked advisories,
 * a posture hero, honest telemetry, sector posture instead of fare math.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS, DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin",
}));

function seedDashboard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12),
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: DISRUPTION_ALERTS }) })
    )
  );
}

describe("Posture hero", () => {
  beforeEach(seedDashboard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("names the network state with the worst active severity", async () => {
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/Degraded/);
    expect(within(strip).getByText("Warning")).toBeInTheDocument();
  });

  it("declares all-clear with no active bulletins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) })
      )
    );
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/All clear/);
  });

  it("keeps a WIB clock in the hero strip", async () => {
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it("demotes the hero subtitle below the posture answer", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId("posture-strip");
    const subtitle = screen.getByText(/integrated monitoring across/i);
    expect(subtitle.className).toMatch(/text-slate-500/);
  });
});

describe("Operate actions", () => {
  beforeEach(seedDashboard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("links the disruptions KPI to the incident queue", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    expect(
      screen.getByRole("link", { name: /open incident queue/i })
    ).toHaveAttribute("href", "/admin/alerts");
  });

  it("links each advisory row to its incident bulletin", async () => {
    render(<AdminDashboardPage />);
    const title = await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    const row = title.closest("a");
    expect(row).not.toBeNull();
    expect(row?.getAttribute("href")).toBe(
      `/admin/alerts#alert-${DISRUPTION_ALERTS[0].id}`
    );
  });

  it("enters broadcast from the hero", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    expect(
      screen.getByRole("link", { name: /broadcast alert to public/i })
    ).toHaveAttribute("href", "/admin/alerts#broadcast-form");
  });
});
