/**
 * RED: schedule freshness UI — the status drawer footer shows the dataset
 * generation date and a stale badge past the 90-day hard line.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { isScheduleStale, SCHEDULE_STALE_AFTER_DAYS } from "@/lib/services/gtfsSchedule";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

const DAY = 24 * 60 * 60 * 1000;
const GEN = Date.parse("2026-10-29T00:00:00Z");

describe("schedule freshness", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: Date.now(),
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
    vi.useRealTimers();
  });

  it("stale logic honors the 90-day hard line", () => {
    expect(SCHEDULE_STALE_AFTER_DAYS).toBe(90);
    expect(isScheduleStale("2026-10-29T00:00:00Z", GEN)).toBe(false);
    expect(isScheduleStale("2026-10-29T00:00:00Z", GEN + 89 * DAY)).toBe(false);
    expect(isScheduleStale("2026-10-29T00:00:00Z", GEN + 91 * DAY)).toBe(true);
    expect(isScheduleStale(undefined, GEN)).toBe(true);
    expect(isScheduleStale("not-a-date", GEN)).toBe(true);
  });

  it("footer shows the dataset generation date", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    await screen.findByRole("dialog");
    expect(screen.getByText(/Schedule data:/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("footer badges stale data past the hard line", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-01T00:00:00Z"));
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.getByText(/Schedule data:/)).toBeInTheDocument();
    expect(screen.getAllByText("Stale").length).toBeGreaterThan(0);
  });
});
