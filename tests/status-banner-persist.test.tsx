/**
 * RED: banner persistence — the strip never auto-collapses to a dot while
 * alerts are active, and the Status drawer entry is present (and tappable)
 * on mobile viewports.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { DisruptionAlertBanner } from "@/components/alerts/DisruptionAlertBanner";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

const JAKARTA_ALERT = {
  id: "alert-banner-1",
  lineId: TRANSIT_LINES[0].id,
  title: "Signal fault near Blok M",
  description: "Single-track working",
  severity: "WARNING",
  status: "ACTIVE",
  affectedStops: ["Blok M"],
  startTime: new Date().toISOString(),
  estimatedEndTime: null,
};

describe("banner persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
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
        json: async () => ({ success: true, data: [JAKARTA_ALERT] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("stays expanded past the old 4s auto-minimize window", async () => {
    vi.useFakeTimers();
    render(<DisruptionAlertBanner onOpenStatusDrawer={() => {}} />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.queryByText("Signal fault near Blok M")).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.queryByText("Signal fault near Blok M")).not.toBeNull();
    expect(
      document.querySelector('[aria-label="Service Status: 1"]')
    ).toBeNull();
  });

  it("exposes the Status drawer entry without a desktop gate", async () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<DisruptionAlertBanner onOpenStatusDrawer={onOpen} />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const statusBtn = screen.getByRole("button", { name: "Status" });
    expect(statusBtn.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(statusBtn.className).toMatch(/min-h-\[44px\]|touch-target/);
  });
});
