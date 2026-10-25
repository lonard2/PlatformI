/**
 * PlatformI - Fleet bulk confirm + aggregate undo tests.
 * Corridor holds confirm in-app with blast-radius copy before anything
 * moves; one Apply produces one undo entry, and one Undo restores all.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

const A: Vehicle = TRANSIT_VEHICLES[0];
const B: Vehicle = TRANSIT_VEHICLES[1];

function seedBoard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: [A, B].map((v, i) => ({
      ...v,
      status: "IN_SERVICE" as const,
      speedKmh: 50,
      crowdLevel: "LEVEL_1_MANY_SEATS" as const,
      lineId: `line-test-${i}`,
    })),
    allLines: [
      ...TRANSIT_LINES,
      {
        ...TRANSIT_LINES[0],
        id: "line-test-0",
        code: "TJ-9",
        name: "Test Corridor 9",
      },
      {
        ...TRANSIT_LINES[0],
        id: "line-test-1",
        code: "TJ-9",
        name: "Test Corridor 9",
      },
    ],
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
  );
}

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

async function selectBoth(): Promise<void> {
  await screen.findByRole("table");
  fireEvent.click(screen.getByRole("checkbox", { name: `Select ${A.vehicleCode}` }));
  fireEvent.click(screen.getByRole("checkbox", { name: `Select ${B.vehicleCode}` }));
}

describe("Bulk confirm gate", () => {
  beforeEach(seedBoard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks in-app with the count before anything moves", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    const dialog = await screen.findByRole("alert", {
      name: /confirm bulk change/i,
    });
    expect(within(dialog).getByText(/2 vehicles/)).toBeInTheDocument();
    // Nothing applied yet: both vehicles still in service at speed.
    const state = useTransitStore.getState().simulatedVehicles;
    expect(state.find((v) => v.id === A.id)?.status).toBe("IN_SERVICE");
    expect(state.find((v) => v.id === B.id)?.status).toBe("IN_SERVICE");
  });

  it("applies to every selected vehicle only after Apply, with one undo", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: /^apply$/i })
    );
    const state = useTransitStore.getState().simulatedVehicles;
    expect(state.find((v) => v.id === A.id)?.status).toBe("CONGESTION_HOLD");
    expect(state.find((v) => v.id === B.id)?.status).toBe("CONGESTION_HOLD");
    expect(state.find((v) => v.id === A.id)?.speedKmh).toBe(0);
    // Exactly one undo affordance for the whole bulk, on the long window.
    expect(screen.getAllByRole("button", { name: /action pending - undo/i })).toHaveLength(1);
    const countdowns = screen.getAllByTestId("undo-countdown");
    expect(
      countdowns.some((el) => /\(1[0-9]s\)/.test(el.textContent ?? ""))
    ).toBe(true);
  });

  it("undoing a bulk restores every vehicle in one action", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /^apply$/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /action pending - undo/i })
    );
    const state = useTransitStore.getState().simulatedVehicles;
    expect(state.find((v) => v.id === A.id)?.status).toBe("IN_SERVICE");
    expect(state.find((v) => v.id === B.id)?.status).toBe("IN_SERVICE");
    expect(state.find((v) => v.id === A.id)?.speedKmh).toBe(50);
    expect(
      screen.queryByRole("button", { name: /action pending - undo/i })
    ).not.toBeInTheDocument();
  });

  it("crowd bulks keep the short non-destructive window", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk crowd/i), {
      target: { value: "LEVEL_3_STANDING_ONLY" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /^apply$/i }));
    const banner = screen
      .getAllByRole("button", { name: /action pending - undo/i })[0]
      .closest("div[class*='rounded-xl']");
    expect(banner?.className).toMatch(/border-cyan/);
    expect(banner?.className).not.toMatch(/border-amber/);
  });

  it("Escape closes the bulk confirm without applying", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    const dialog = await screen.findByRole("alert", {
      name: /confirm bulk change/i,
    });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(
      screen.queryByRole("alert", { name: /confirm bulk change/i })
    ).not.toBeInTheDocument();
    expect(
      useTransitStore.getState().simulatedVehicles.find((v) => v.id === A.id)?.status
    ).toBe("IN_SERVICE");
  });

  it("opens no confirm when the bulk would change nothing", async () => {
    render(<AdminFleetPage />);
    await selectBoth();
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "IN_SERVICE" },
    });
    expect(
      screen.queryByRole("alert", { name: /confirm bulk change/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /action pending - undo/i })
    ).not.toBeInTheDocument();
  });
});
