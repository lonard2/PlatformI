/**
 * RED: post-deploy vehicle identity edit — the telemetry modal edits run
 * number, trainset, formation, depot, fleet, plate, and operator via PUT
 * with a field-scoped undo, instead of deploy-only identity.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

const BASE: Vehicle = {
  ...TRANSIT_VEHICLES[0],
  id: "veh-identity-1",
  vehicleCode: "ID-001",
  lineId: TRANSIT_LINES[0].id,
  runNumber: "R-OLD",
  licensePlate: "B 1 OLD",
};

function seedBoard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: [{ ...BASE }],
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
}

function okJson(payload: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  } as Response);
}

describe("fleet identity edit", () => {
  let puts: { url: string; body: Record<string, unknown> }[];

  beforeEach(() => {
    seedBoard();
    puts = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "PUT" && String(url).includes("/api/fleet/vehicles")) {
          puts.push({ url, body: JSON.parse(String(init.body)) });
        }
        return okJson({ success: true, data: [] });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openTelemetry(): Promise<HTMLElement> {
    render(<AdminFleetPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /view telemetry for ID-001/i })
    );
    return (await screen.findByRole("dialog")) as HTMLElement;
  }

  it("edits run number and plate through the telemetry modal", async () => {
    const dialog = await openTelemetry();
    fireEvent.change(dialog.querySelector("#tele-id-run") as HTMLInputElement, {
      target: { value: "R-NEW" },
    });
    fireEvent.change(dialog.querySelector("#tele-id-plate") as HTMLInputElement, {
      target: { value: "B 2 NEW" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save identity/i }));
    await waitFor(() => {
      expect(
        puts.some((p) => p.body.runNumber === "R-NEW" && p.body.licensePlate === "B 2 NEW")
      ).toBe(true);
    });
    const v = useTransitStore.getState().simulatedVehicles.find((x) => x.id === "veh-identity-1");
    expect(v?.runNumber).toBe("R-NEW");
  });

  it("undoes the identity edit in one action", async () => {
    const dialog = await openTelemetry();
    fireEvent.change(dialog.querySelector("#tele-id-run") as HTMLInputElement, {
      target: { value: "R-NEW" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save identity/i }));
    await waitFor(() => expect(puts.length).toBeGreaterThan(0));
    fireEvent.click(await screen.findByRole("button", { name: /action pending - undo/i }));
    await waitFor(() => {
      expect(
        puts.some((p) => p.body.runNumber === "R-OLD" && p.body.licensePlate === "B 1 OLD")
      ).toBe(true);
    });
    const v = useTransitStore.getState().simulatedVehicles.find((x) => x.id === "veh-identity-1");
    expect(v?.runNumber).toBe("R-OLD");
  });
});
