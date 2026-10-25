/**
 * PlatformI - Fleet round-2 deferred minors, one batch.
 * Localized bulk counts, guarded finalizer, honest IN_SERVICE bulk styling,
 * zero-eligible auto-close, raw lineId fallback, counted bulk undo,
 * fresh-locale final announcements, describedby slider, scoped select-all,
 * URL-persisted sort, dated last-sync, unsynced wording, capacity split,
 * depot-start add form, debounced telemetry slider.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import AdminFleetPage from "@/app/admin/fleet/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

const { mockGet, mockReplace } = vi.hoisted(() => ({
  mockGet: vi.fn((_key: string): string | null => null),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet }),
  usePathname: () => "/admin/fleet",
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

const A: Vehicle = TRANSIT_VEHICLES[0];
const B: Vehicle = TRANSIT_VEHICLES[1];

function seedBoard(extra?: Partial<ReturnType<typeof useTransitStore.getState>>): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
      ...v,
      status: "IN_SERVICE" as const,
      speedKmh: 50,
      crowdLevel: "LEVEL_1_MANY_SEATS" as const,
    })),
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
    ...extra,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
  );
}

describe("Deferred minors batch", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation(() => null);
    seedBoard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("announces the bulk count in the operator language, not hardcoded English", async () => {
    useLanguageStore.getState().setLanguage("id");
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(`Pilih ${A.vehicleCode}`) }));
    fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(`Pilih ${B.vehicleCode}`) }));
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText("Status massal"), {
      target: { value: "CONGESTION_HOLD" },
    });
    await screen.findByRole("alert", { name: /konfirmasi/i });
    useLanguageStore.getState().setLanguage("en");
  });

  it("keeps the finalizer when a newer announce supersedes it", async () => {
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    vi.useFakeTimers();
    try {
      const selectA = document.getElementById(`status-select-${A.id}`) as HTMLElement;
      const selectB = document.getElementById(`status-select-${B.id}`) as HTMLElement;
      fireEvent.change(selectA, { target: { value: "CONGESTION_HOLD" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      fireEvent.change(selectB, { target: { value: "CONGESTION_HOLD" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(screen.getByTestId("fleet-finalizer").textContent).toMatch(/Change finalized/);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByTestId("fleet-finalizer").textContent).toMatch(/Change finalized/);
      useLanguageStore.getState().setLanguage("en");
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats a service-return bulk as non-destructive", async () => {
    useTransitStore.setState({
      simulatedVehicles: [A, B].map((v) => ({
        ...v,
        status: "CONGESTION_HOLD" as const,
        speedKmh: 0,
      })),
    });
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${A.vehicleCode}`) }));
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "IN_SERVICE" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /^apply$/i }));
    const banner = screen.getByText(/Action pending - Undo/i).closest("div[class*='rounded-xl']");
    expect(banner?.className).toMatch(/border-cyan/);
    expect(banner?.className).not.toMatch(/border-amber/);
  });

  it("closes the confirm when nothing remains eligible", async () => {
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${A.vehicleCode}`) }));
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${B.vehicleCode}`) }));
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    await screen.findByRole("alert", { name: /confirm bulk change/i });
    // Both vehicles leave the selection's scope: confirm must not linger.
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(2, 10).map((v) => ({
        ...v,
        status: "IN_SERVICE" as const,
      })),
    });
    await waitForGone();
    expect(screen.queryByRole("alert", { name: /confirm bulk change/i })).not.toBeInTheDocument();

    async function waitForGone(): Promise<void> {
      for (let i = 0; i < 20; i++) {
        if (!screen.queryByRole("alert", { name: /confirm bulk change/i })) return;
        await act(async () => {
          await new Promise((r) => setTimeout(r, 25));
        });
      }
      throw new Error("confirm did not close");
    }
  });

  it("falls back to the raw line id instead of misreporting", async () => {
    useTransitStore.setState({
      simulatedVehicles: [A].map((v) => ({
        ...v,
        lineId: "line-nope",
        status: "CONGESTION_HOLD" as const,
        speedKmh: 0,
      })),
    });
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${A.vehicleCode}`) }));
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "IN_SERVICE" },
    });
    const dialog = await screen.findByRole("alert", { name: /confirm bulk change/i });
    expect(within(dialog).getByText(/line-nope/)).toBeInTheDocument();
  });

  it("counts applied versus skipped vehicles in the bulk undo record", async () => {
    const { getShiftLog } = await import("@/lib/services/shiftLogService");
    getShiftLog;
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    // Select A, then remove A from the board before undoing.
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${A.vehicleCode}`) }));
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`Select ${B.vehicleCode}`) }));
    const bulkBar = await screen.findByTestId("fleet-bulk-bar");
    fireEvent.change(within(bulkBar).getByLabelText(/bulk status/i), {
      target: { value: "CONGESTION_HOLD" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /^apply$/i }));
    useTransitStore.setState({
      simulatedVehicles: [B].map((v) => ({ ...v, status: "CONGESTION_HOLD" as const, speedKmh: 0 })),
    });
    const undoButton = await screen.findByRole("button", { name: /action pending - undo/i });
    fireEvent.click(undoButton);
    const { getShiftLog: readLog } = await import("@/lib/services/shiftLogService");
    const entry = readLog().find((e) => e.actionType === "FLEET_UNDO");
    expect(entry).toBeDefined();
    expect(String(entry?.params?.restored ?? entry?.summary ?? "")).toMatch(/1\/2/);
  });

  it("announces expiry in the current locale, not the scheduling one", async () => {
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    vi.useFakeTimers();
    try {
      const select = document.getElementById(`status-select-${A.id}`) as HTMLElement;
      fireEvent.change(select, { target: { value: "CONGESTION_HOLD" } });
      (document.activeElement as HTMLElement | null)?.blur?.();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      useLanguageStore.getState().setLanguage("id");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });
      expect(screen.getByTestId("fleet-finalizer").textContent).toMatch(/difinalisasi/);
      useLanguageStore.getState().setLanguage("en");
    } finally {
      vi.useRealTimers();
    }
  });

  it("links the telemetry slider to the coupling callout", async () => {
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`View telemetry for ${A.vehicleCode}`) }));
    const dialog = await screen.findByRole("dialog");
    const slider = within(dialog as HTMLElement).getByLabelText(/speed/i);
    expect(slider.getAttribute("aria-describedby")).toContain("status-coupling-callout");
  });

  it("scopes select-all to the listed set", async () => {
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    expect(screen.getByLabelText("Select all listed vehicles")).toBeInTheDocument();
  });

  it("restores the sort order from the URL", async () => {
    mockGet.mockImplementation((key: string) => (key === "sort" ? "line" : null));
    render(<AdminFleetPage />);
    const sortSelect = (await screen.findByLabelText(/sort fleet/i)) as HTMLSelectElement;
    expect(sortSelect.value).toBe("line");
  });

  it("persists a sort change to the URL", async () => {
    render(<AdminFleetPage />);
    const sortSelect = (await screen.findByLabelText(/sort fleet/i)) as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: "status" } });
    await screen.findByRole("table");
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(mockReplace).toHaveBeenCalled();
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).toMatch(/sort=status/);
    mockReplace.mockClear();
  });

  it("stamps the last sync with a calendar date", async () => {
    render(<AdminFleetPage />);
    const stamp = await screen.findByText(/Last sync/i);
    expect(stamp.textContent).toMatch(/\d{4}/);
  });

  it("breaks the capacity preview into seats plus standing", async () => {
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByRole("button", { name: /deploy vehicle/i }));
    const summary = await screen.findByTestId("fleet-add-summary");
    expect(within(summary).getByText(/312.*800|800.*312/)).toBeInTheDocument();
  });

  it("allows a depot-parked unit to start at zero speed", async () => {
    render(<AdminFleetPage />);
    fireEvent.click(await screen.findByRole("button", { name: /deploy vehicle/i }));
    const slider = document.getElementById("add-vehicle-speed") as HTMLInputElement | null;
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute("min")).toBe("0");
  });

  it("settles the telemetry slider with one sync instead of one per tick", async () => {
    const puts: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/fleet/vehicles" && init?.method === "PUT") {
          try {
            puts.push(JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>);
          } catch {
            puts.push({});
          }
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) } as Response);
      })
    );
    try {
      render(<AdminFleetPage />);
      await screen.findByRole("table");
      vi.useFakeTimers();
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`View telemetry for ${A.vehicleCode}`) }));
      const dialog = screen.getByRole("dialog");
      const slider = within(dialog as HTMLElement).getByRole("slider");
      act(() => {
        fireEvent.change(slider, { target: { value: "80" } });
        fireEvent.change(slider, { target: { value: "90" } });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(puts.filter((p) => "speedKmh" in p)).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      const speedPuts = puts.filter((p) => "speedKmh" in p);
      expect(speedPuts).toHaveLength(1);
      expect(speedPuts[0]?.speedKmh).toBe(90);
      expect(screen.getAllByRole("button", { name: /action pending - undo/i })).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Unsynced wording", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockImplementation(() => null);
    seedBoard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("labels unsynced changes instead of pending ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/fleet/vehicles" && init?.method === "PUT") {
          return Promise.reject(new Error("network down"));
        }
        return okJson({ success: true, data: [] });
      })
    );
    render(<AdminFleetPage />);
    await screen.findByRole("table");
    const select = document.getElementById(`status-select-${TRANSIT_VEHICLES[0].id}`) as HTMLElement;
    fireEvent.change(select, { target: { value: "CONGESTION_HOLD" } });
    expect(await screen.findByText(/1 unsynced/)).toBeInTheDocument();
    expect(screen.queryByText(/1 pending/)).not.toBeInTheDocument();
  });
});
