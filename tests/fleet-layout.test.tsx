/**
 * PlatformI - Fleet layout honesty tests.
 * Empty boards explain themselves with a reset, first paint shows a
 * loading skeleton instead of unconfirmed seeds, touch targets fit thumbs,
 * and Code + Actions stay pinned while the middle columns scroll.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

const mockSearchParams = { get: (_key: string): string | null => null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/admin/fleet",
}));

const SEED: Vehicle[] = TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
  ...v,
  status: "IN_SERVICE" as const,
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function seedBoard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: SEED,
    allLines: TRANSIT_LINES,
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

describe("Fleet empty and loading states", () => {
  beforeEach(seedBoard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("explains an empty board and clears the filters on request", async () => {
    render(<AdminFleetPage />);
    fireEvent.change(await screen.findByPlaceholderText(/search vehicle code/i), {
      target: { value: "zzz-no-such-code" },
    });
    const empty = await screen.findByTestId("fleet-empty-state");
    expect(within(empty).getByText("No vehicles match your search or filters.")).toBeInTheDocument();
    fireEvent.click(within(empty).getByRole("button", { name: /clear filters/i }));
    expect(await screen.findByText(SEED[0].vehicleCode)).toBeInTheDocument();
    expect(screen.queryByTestId("fleet-empty-state")).not.toBeInTheDocument();
  });

  it("shows skeleton rows while the first sync is in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {}))
    );
    render(<AdminFleetPage />);
    expect(await screen.findAllByTestId("fleet-skeleton-row")).toHaveLength(3);
  });
});

describe("Fleet touch and scroll targets", () => {
  beforeEach(seedBoard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gives row checkboxes a 24px hit area", async () => {
    render(<AdminFleetPage />);
    const box = await screen.findByRole("checkbox", {
      name: new RegExp(`Select ${SEED[0].vehicleCode}`),
    });
    expect(box.className).toMatch(/w-6/);
    expect(box.className).toMatch(/h-6/);
  });

  it("pins the Code and Actions columns while the middle scrolls", async () => {
    render(<AdminFleetPage />);
    await screen.findByText(SEED[0].vehicleCode);
    const codeHeader = screen.getByRole("columnheader", { name: "Vehicle Code" });
    expect(codeHeader.className).toMatch(/sticky/);
    const actionHeader = document.querySelector("thead th:last-child");
    expect(actionHeader?.className).toMatch(/sticky/);
  });
});
