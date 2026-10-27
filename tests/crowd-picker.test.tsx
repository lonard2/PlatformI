/**
 * RED: one combobox for vehicle targeting — type to filter with a live
 * count, keyboard + pointer selection, line-scope chip with clear, echo of
 * the chosen vehicle, and an explicit empty state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInModal } from "@/components/crowdsource/CheckInModal";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

const VEHICLES = [
  {
    id: "veh-1",
    vehicleCode: "TS-01",
    name: "Test Bus Satu",
    lineId: "line-tj-brt-1",
  },
  {
    id: "veh-2",
    vehicleCode: "TS-02",
    name: "Test Bus Dua",
    lineId: "line-tj-brt-1",
  },
  {
    id: "veh-9",
    vehicleCode: "KC-01",
    name: "Other Line Car",
    lineId: "line-other",
  },
];

const LINES = [{ id: "line-tj-brt-1", code: "1", name: "Test BRT" }];

describe("crowd vehicle combobox", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useTransitStore.setState({
      allLines: LINES as never,
      allStops: [],
      simulatedVehicles: VEHICLES as never,
      activeAlerts: [],
      alertsSyncedAt: null,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openScoped() {
    render(
      <CheckInModal
        isOpen
        onClose={() => {}}
        initialVehicleId={null}
        initialLineId="line-tj-brt-1"
      />
    );
    await screen.findByRole("dialog");
    return screen.getByRole("combobox", { name: /Target Transit Vehicle/ });
  }

  it("scopes to the line with a removable chip and live count", async () => {
    const box = await openScoped();
    expect(
      screen.getByRole("button", { name: "Clear line scope" })
    ).toHaveTextContent("1");
    expect(screen.getByText("2 vehicles")).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /KC-01/ })
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear line scope" }));
    expect(screen.getByText("3 vehicles")).toBeInTheDocument();
    expect(box).toBeInTheDocument();
  });

  it("filters on type and selects by pointer with echo", async () => {
    const box = await openScoped();
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "dua" } });
    expect(screen.getByText("1 vehicles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /TS-02/ }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText(/TS-02/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Vehicle Check-In" })
    );
    expect(
      await screen.findByText("Report Broadcasted Successfully")
    ).toBeInTheDocument();
  });

  it("supports ArrowDown + Enter keyboard selection", async () => {
    const box = await openScoped();
    fireEvent.focus(box);
    expect(box.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText(/TS-02/)).toBeInTheDocument();
  });

  it("Escape closes the list without closing the modal", async () => {
    const onClose = vi.fn();
    render(
      <CheckInModal
        isOpen
        onClose={onClose}
        initialVehicleId={null}
        initialLineId={null}
      />
    );
    await screen.findByRole("dialog");
    const box = screen.getByRole("combobox", { name: /Target Transit Vehicle/ });
    fireEvent.focus(box);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows an explicit empty state for no matches", async () => {
    const box = await openScoped();
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "zzz-no-such-bus" } });
    expect(
      screen.getByText("No vehicles match your search")
    ).toBeInTheDocument();
    expect(screen.getByText("0 vehicles")).toBeInTheDocument();
  });
});
