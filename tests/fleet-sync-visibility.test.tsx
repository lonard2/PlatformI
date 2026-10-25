/**
 * PlatformI - Fleet sync visibility tests.
 * The fleet header answers "is this board the database truth?" with an
 * explicit Sync now control, a last-sync timestamp, and a pending-changes
 * indicator — never a silent mount-time merge.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/fleet",
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Fleet sync visibility", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows an explicit Sync now control with a last-sync timestamp", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
    render(<AdminFleetPage />);
    expect(await screen.findByRole("button", { name: /sync now/i })).toBeInTheDocument();
    expect(await screen.findByText(/last sync/i)).toBeInTheDocument();
  });

  it("Sync now re-pulls the board and reports the pull count", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        calls.push(String(url));
        return okJson({ success: true, data: [] });
      })
    );
    render(<AdminFleetPage />);
    const syncBtn = await screen.findByRole("button", { name: /sync now/i });
    const before = calls.filter((u) => u.startsWith("/api/fleet/vehicles")).length;
    fireEvent.click(syncBtn);
    await screen.findByText(/0 new/i);
    const after = calls.filter((u) => u.startsWith("/api/fleet/vehicles")).length;
    expect(after).toBeGreaterThan(before);
  });

  it("surfaces a failed board sync instead of failing silent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new Error("network down")))
    );
    render(<AdminFleetPage />);
    expect(await screen.findByText(/sync failed/i)).toBeInTheDocument();
  });
});
