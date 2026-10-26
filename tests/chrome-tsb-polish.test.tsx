/**
 * RED: dead-end corridors acknowledge the tap with schedule-only feedback
 * and keep the tray open instead of silently doing nothing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    activeAlerts: [],
    activeDrawer: null,
    selectedStopId: null,
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

describe("dead-end corridor taps", () => {
  it("announces schedule-only and keeps the tray open", async () => {
    render(<TransportationSystemBar />);
    fireEvent.click(await screen.findByRole("button", { name: /mikrotrans/i }));
    const tray = document.getElementById("system-tray-sys-mikrotrans") as HTMLElement;
    // JAK.04 has no map target (no lineId/stopId/coordinates).
    fireEvent.click(await within(tray).findByRole("button", { name: /JAK\.04/ }));
    // Name computation is unreliable while framer freezes mid-animation
    // headlessly, so match the text and prove it sits in the live region.
    const matches = await within(tray).findAllByText(/no live map geometry for this route/i);
    const announced = matches.find((el) => (el as HTMLElement).closest('[role="status"]'));
    expect(announced).toBeDefined();
    expect(document.getElementById("system-tray-sys-mikrotrans")).not.toBeNull();
    expect(useTransitStore.getState().selectedStopId).toBeNull();
  });
});
