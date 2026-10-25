/**
 * PlatformI - Fleet quieter triage + single-shot finalizer tests.
 * Single-row edits keep keyboard focus where it is, and when an undo
 * window expires silently the board announces the finalization once.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function seedBoard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
      ...v,
      status: "IN_SERVICE" as const,
      speedKmh: 50,
    })),
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

describe("Quiet single-row edits", () => {
  beforeEach(seedBoard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("leaves focus on the edited control instead of stealing it", async () => {
    render(<AdminFleetPage />);
    const select = await screen.findByLabelText(
      `Operating Status: ${TARGET.vehicleCode}`
    );
    (select as HTMLElement).focus();
    fireEvent.change(select, { target: { value: "CONGESTION_HOLD" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(document.activeElement).toBe(select);
  });
});

describe("Fleet finalizer", () => {
  beforeEach(seedBoard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("announces once when an undo window expires", async () => {
    render(<AdminFleetPage />);
    const select = await screen.findByLabelText(
      `Operating Status: ${TARGET.vehicleCode}`
    );
    vi.useFakeTimers();
    try {
      (select as HTMLElement).focus();
      fireEvent.change(select, { target: { value: "CONGESTION_HOLD" } });
      expect(screen.getByText(/Action pending - Undo/i)).toBeInTheDocument();
      (document.activeElement as HTMLElement | null)?.blur?.();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      const announcer = screen.getByTestId("fleet-finalizer");
      expect(announcer.textContent).toMatch(/Change finalized/);
      expect(screen.queryByText(/Action pending - Undo/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the finalizer so a later finalize announces again", async () => {
    render(<AdminFleetPage />);
    const select = await screen.findByLabelText(
      `Operating Status: ${TARGET.vehicleCode}`
    );
    vi.useFakeTimers();
    try {
      (select as HTMLElement).focus();
      fireEvent.change(select, { target: { value: "CONGESTION_HOLD" } });
      expect(screen.getByText(/Action pending - Undo/i)).toBeInTheDocument();
      (document.activeElement as HTMLElement | null)?.blur?.();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.getByTestId("fleet-finalizer")).toHaveTextContent(
        /Change finalized/
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.getByTestId("fleet-finalizer")).toHaveTextContent("");
    } finally {
      vi.useRealTimers();
    }
  });
});
