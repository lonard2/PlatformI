/**
 * RED: passenger-voice status copy — the drawer speaks commuter language
 * (Service Status, Lines Running Normally, Typical Fix Time, Cause,
 * What We're Doing) and INFO alerts get their own badge, not "Normal".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { DisruptionAlertBanner } from "@/components/alerts/DisruptionAlertBanner";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useRegionStore } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

const INFO_ALERT = {
  id: "alert-copy-1",
  lineId: TRANSIT_LINES[0].id,
  title: "Planned timetable adjustment",
  description: "Weekend engineering works",
  severity: "INFO",
  status: "ACTIVE",
  affectedStops: [],
  startTime: new Date().toISOString(),
  estimatedEndTime: null,
};

function stubApi(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/alerts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [INFO_ALERT] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

describe("status passenger voice", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useRegionStore.setState({ activeRegionId: "reg-jabodetabek-01" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      simulatedVehicles: [],
      activeAlerts: [INFO_ALERT as never],
      alertsSyncedAt: Date.now(),
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    stubApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("titles the drawer for commuters, not the OCC", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Service Status" })).toBeInTheDocument();
    expect(screen.queryByText("Operations & Reliability Command Center")).toBeNull();
    expect(screen.queryByText(/Mean Time to Recovery/)).toBeNull();
    expect(screen.queryByText(/Technical Root Cause/)).toBeNull();
  });

  it("labels KPIs in plain language", async () => {
    render(<ServiceStatusDrawer isOpen onClose={() => {}} />);
    await screen.findByRole("heading", { name: "Service Status" });
    const uptimeTab = screen.getByRole("tab", { name: /reliability/i });
    fireEvent.click(uptimeTab);
    expect(await screen.findByText("Lines Running Normally")).toBeInTheDocument();
    expect(screen.getByText(/Typical Fix Time/)).toBeInTheDocument();
    expect(screen.queryByText(/On-Time Performance/)).toBeNull();
  });

  it("gives INFO alerts their own badge instead of Normal", async () => {
    render(<DisruptionAlertBanner onOpenStatusDrawer={() => {}} />);
    expect((await screen.findAllByText("Info", { exact: true })).length).toBeGreaterThan(0);
    expect(screen.queryByText("Normal")).toBeNull();
  });
});
