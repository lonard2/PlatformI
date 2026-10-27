/**
 * RED: photo attach/remove — the telemetry modal attaches gallery photos
 * (URL + caption + credit + tag) and removes them via PUT, instead of
 * API-only photo support with no OCC surface.
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
  id: "veh-photo-1",
  vehicleCode: "PH-001",
  lineId: TRANSIT_LINES[0].id,
  photos: [],
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

describe("fleet photo attach", () => {
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
      await screen.findByRole("button", { name: /view telemetry for PH-001/i })
    );
    return (await screen.findByRole("dialog")) as HTMLElement;
  }

  it("attaches a photo then removes it", async () => {
    const dialog = await openTelemetry();
    fireEvent.change(dialog.querySelector("#tele-photo-url") as HTMLInputElement, {
      target: { value: "https://example.com/fleet/ph-001.jpg" },
    });
    fireEvent.change(dialog.querySelector("#tele-photo-caption") as HTMLInputElement, {
      target: { value: "PH-001 at depot" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /add photo/i }));
    await waitFor(() => {
      expect(
        puts.some((p) =>
          ((p.body.photos as Array<Record<string, unknown>>) || []).some(
            (ph) => ph.url === "https://example.com/fleet/ph-001.jpg"
          )
        )
      ).toBe(true);
    });
    let v = useTransitStore.getState().simulatedVehicles.find((x) => x.id === "veh-photo-1");
    expect(v?.photos).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole("button", { name: /remove photo.*ph-001/i }));
    await waitFor(() => {
      expect(
        puts.some(
          (p) => Array.isArray(p.body.photos) && (p.body.photos as unknown[]).length === 0
        )
      ).toBe(true);
    });
    v = useTransitStore.getState().simulatedVehicles.find((x) => x.id === "veh-photo-1");
    expect(v?.photos).toHaveLength(0);
  });
});
