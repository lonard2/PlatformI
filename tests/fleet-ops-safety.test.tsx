/**
 * PlatformI - Fleet delete safety and sync visibility tests.
 * Deletes confirm in-app with the vehicle code (never window.confirm),
 * destructive undos last longer than field edits, and failed API syncs
 * surface inline with a working retry.
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

const TARGET: Vehicle = TRANSIT_VEHICLES[0];

function mockFleetApi(impl: (url: string, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
}

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

describe("Fleet delete confirmation", () => {
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
    mockFleetApi((url: string) =>
      String(url).startsWith("/api/fleet/vehicles")
        ? okJson({ success: true, data: [] })
        : okJson({ success: true, data: [] })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks in-app with the vehicle code and never calls window.confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByLabelText(`Delete vehicle ${TARGET.vehicleCode}`));
    expect(await screen.findByText(new RegExp(`Delete ${TARGET.vehicleCode} from the fleet\\?`))).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("deletes only after explicit confirmation and starts a 15s undo", async () => {
    const calls: string[] = [];
    mockFleetApi((url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/fleet/vehicles") && init?.method === "DELETE") {
        calls.push(String(url));
      }
      return okJson({ success: true, data: [] });
    });
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByLabelText(`Delete vehicle ${TARGET.vehicleCode}`));
    expect(calls).toHaveLength(0);
    fireEvent.click(await screen.findByRole("button", { name: /^delete$/i }));
    await screen.findByText(/Action pending - Undo/i);
    expect(calls).toHaveLength(1);
    // Destructive undos get the long window: the countdown reads in the teens,
    // never the ~5s of a field edit (exact digit depends on tick phase).
    const countdowns = screen.getAllByTestId("undo-countdown");
    expect(
      countdowns.some((el) => /\(1[0-9]s\)/.test(el.textContent ?? ""))
    ).toBe(true);
  });

  it("surfaces a failed delete sync inline with a working retry", async () => {
    let deletes = 0;
    mockFleetApi((url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/fleet/vehicles") && init?.method === "DELETE") {
        deletes += 1;
        if (deletes === 1) return Promise.reject(new Error("network down"));
        return okJson({ success: true, data: {} });
      }
      return okJson({ success: true, data: [] });
    });
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByLabelText(`Delete vehicle ${TARGET.vehicleCode}`));
    fireEvent.click(await screen.findByRole("button", { name: /^delete$/i }));
    expect(await screen.findByText(new RegExp(`Fleet sync failed for ${TARGET.vehicleCode}`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry sync/i }));
    await screen.findByText(/Action pending - Undo/i);
    expect(deletes).toBe(2);
    expect(screen.queryByText(new RegExp(`Fleet sync failed for ${TARGET.vehicleCode}`))).not.toBeInTheDocument();
  });
});
