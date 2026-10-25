/**
 * PlatformI - OCC dashboard critique fixes.
 * The command surface operates: incident queue CTAs, deep-linked advisories,
 * a posture hero, honest telemetry, sector posture instead of fare math.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS, DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Vehicle } from "@/types/transit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin",
}));

function seedDashboard(): void {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12),
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({ success: true, data: DISRUPTION_ALERTS }) })
    )
  );
}

describe("Worst-corridor KPI", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12).map(
        (v, i): Vehicle => ({
          ...v,
          lineId: "line-tj-cor-1",
          status: i < 3 ? "CONGESTION_HOLD" : "IN_SERVICE",
        })
      ),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ success: true, data: DISRUPTION_ALERTS }) })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("names the corridor holding the most vehicles", async () => {
    render(<AdminDashboardPage />);
    const card = await screen.findByTestId("kpi-worst-corridor");
    const lineCode = TRANSIT_LINES.find((l) => l.id === "line-tj-cor-1")?.code ?? "";
    expect(within(card).getByText("Worst Corridor")).toBeInTheDocument();
    expect(within(card).getByText(lineCode)).toBeInTheDocument();
    expect(within(card).getByText(/\(3\)/)).toBeInTheDocument();
  });

  it("declares no held vehicles when the board is clear", async () => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12).map(
        (v): Vehicle => ({
          ...v,
          status: "IN_SERVICE",
        })
      ),
    });
    render(<AdminDashboardPage />);
    const card = await screen.findByTestId("kpi-worst-corridor");
    expect(within(card).getByText("No held vehicles")).toBeInTheDocument();
  });

  it("retires the fare-volume KPI from the ops board", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId("kpi-worst-corridor");
    expect(screen.queryByText("Est. Occupied-Cabin Value")).not.toBeInTheDocument();
  });
});

describe("Telemetry stream honesty", () => {
  beforeEach(seedDashboard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("discloses the sampling basis instead of a bare sample badge", async () => {
    render(<AdminDashboardPage />);
    expect(await screen.findByText(/Showing \d+ of \d+/)).toBeInTheDocument();
    expect(screen.queryByText("Fleet Sample")).not.toBeInTheDocument();
  });

  it("caps the stream with a View-all link into Fleet", async () => {
    render(<AdminDashboardPage />);
    await screen.findByText(/Showing \d+ of \d+/);
    expect(
      screen.getByRole("link", { name: /view all in fleet/i })
    ).toHaveAttribute("href", "/admin/fleet");
  });

  it("renders structured cells, not one concatenated sentence", async () => {
    render(<AdminDashboardPage />);
    await screen.findByText(/Showing \d+ of \d+/);
    expect(screen.queryByText(/tracking at/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/km\/h/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/°/).length).toBeGreaterThan(0);
  });
});

describe("Loading, empty, and stale states", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows skeleton rows while advisories load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {}))
    );
    render(<AdminDashboardPage />);
    expect(screen.getAllByTestId("advisory-skeleton")).toHaveLength(3);
  });

  it("declares an empty telemetry stream instead of rendering silence", async () => {
    useTransitStore.setState({
      simulatedVehicles: [],
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    render(<AdminDashboardPage />);
    expect(await screen.findByText(/No live telemetry/)).toBeInTheDocument();
  });

  it("retries the alerts fetch from the stale banner", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminDashboardPage />);
    fireEvent.click(await screen.findByRole("button", { name: /retry sync/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("never reports all-clear when the first load fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new Error("network down")))
    );
    render(<AdminDashboardPage />);
    await screen.findByText(/Advisory state unknown/);
    expect(screen.queryByText("No active advisories.")).not.toBeInTheDocument();
  });
});

describe("Posture hero", () => {
  beforeEach(seedDashboard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("names the network state with the worst active severity", async () => {
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/Degraded/);
    expect(within(strip).getByText("Warning")).toBeInTheDocument();
  });

  it("declares all-clear with no active bulletins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) })
      )
    );
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/All clear/);
  });

  it("keeps a WIB clock in the hero strip", async () => {
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    expect(strip.textContent).toMatch(/\d{1,2}:\d{2}/);
  });


});

describe("Operate actions", () => {
  beforeEach(seedDashboard);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("links the disruptions KPI to the incident queue", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    expect(
      screen.getByRole("link", { name: /open incident queue/i })
    ).toHaveAttribute("href", "/admin/alerts");
  });

  it("links each advisory row to its incident bulletin", async () => {
    render(<AdminDashboardPage />);
    const title = await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    const row = title.closest("a");
    expect(row).not.toBeNull();
    expect(row?.getAttribute("href")).toBe(
      `/admin/alerts#alert-${DISRUPTION_ALERTS[0].id}`
    );
  });

  it("enters broadcast from the hero", async () => {
    render(<AdminDashboardPage />);
    await screen.findByTestId(`advisory-text-${DISRUPTION_ALERTS[0].id}`);
    expect(
      screen.getByRole("link", { name: /broadcast alert to public/i })
    ).toHaveAttribute("href", "/admin/alerts#broadcast-form");
  });
});

describe("Deferred minors batch", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ success: true, data: DISRUPTION_ALERTS }) })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("paints INFO bulletins cyan instead of amber", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                ...DISRUPTION_ALERTS[0],
                id: "alert-test-info",
                lineId: "line-unknown",
                severity: "INFO",
                status: "ACTIVE",
                title: "Info Test Notice",
                description: "Routine info",
              },
            ],
          }),
        })
      )
    );
    render(<AdminDashboardPage />);
    const text = await screen.findByText(/Info Test Notice/);
    const row = text.closest("li");
    expect(row).not.toBeNull();
    const badge = within(row as HTMLElement).getByText("Info");
    expect(badge.className).toMatch(/cyan/);
    expect(badge.className).not.toMatch(/amber/);
  });

  it("marks up times as machine-readable time elements", async () => {
    render(<AdminDashboardPage />);
    await screen.findByText(/Showing \d+ of \d+/);
    const times = document.querySelectorAll("time[datetime]");
    expect(times.length).toBeGreaterThan(0);
  });

  it("announces the empty telemetry state instead of rendering silence", async () => {
    useTransitStore.setState({
      simulatedVehicles: [],
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    render(<AdminDashboardPage />);
    const empty = await screen.findByTestId("telemetry-empty");
    expect(empty).toHaveTextContent(/no live telemetry/i);
    expect(empty.getAttribute("role")).toBe("status");
  });

  it("falls back to the raw line id when the line catalog misses", async () => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 4).map((v) => ({
        ...v,
        lineId: "line-nope",
        status: "CONGESTION_HOLD" as Vehicle["status"],
      })),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    render(<AdminDashboardPage />);
    const card = await screen.findByTestId("kpi-worst-corridor");
    expect(within(card).getByText("line-nope")).toBeInTheDocument();
    expect(within(card).queryByText("No held vehicles")).not.toBeInTheDocument();
  });

  it("gates the pulse animation behind reduced-motion preference", () => {
    render(<AdminDashboardPage />);
    expect(document.querySelector(".animate-pulse")).toBeNull();
    expect(document.querySelector('[class*="motion-safe"]')).not.toBeNull();
  });

  it("keeps the hub name visible via i18n instead of hardcoding", () => {
    render(<AdminDashboardPage />);
    expect(screen.getByText("Dukuh Atas TOD")).toBeInTheDocument();
  });

  it("structures feed lists as real lists", async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(document.querySelectorAll("ul").length).toBeGreaterThanOrEqual(2);
    });
    expect(document.querySelectorAll("li").length).toBeGreaterThan(0);
  });

  it("applies Japanese count order for the sampling disclosure", async () => {
    useLanguageStore.getState().setLanguage("ja");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 12).map((v) => ({
        ...v,
        status: "IN_SERVICE" as Vehicle["status"],
      })),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    render(<AdminDashboardPage />);
    expect(await screen.findByText("12件中4件を表示")).toBeInTheDocument();
    useLanguageStore.getState().setLanguage("en");
  });

  it("declares a critical posture for critical bulletins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                ...DISRUPTION_ALERTS[0],
                id: "alert-test-crit",
                severity: "CRITICAL",
                status: "ACTIVE",
                title: "Critical Test",
                description: "Critical desc",
              },
            ],
          }),
        })
      )
    );
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    await waitFor(() => expect(strip.textContent).toMatch(/Critical/));
  });

  it("ties the worst corridor to the highest hold count", async () => {
    useTransitStore.setState({
      simulatedVehicles: [
        ...TRANSIT_VEHICLES.slice(0, 2).map((v) => ({ ...v, lineId: "line-a", status: "CONGESTION_HOLD" as const })),
        ...TRANSIT_VEHICLES.slice(2, 6).map((v) => ({ ...v, lineId: "line-b", status: "CONGESTION_HOLD" as const })),
      ],
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    render(<AdminDashboardPage />);
    const card = await screen.findByTestId("kpi-worst-corridor");
    expect(within(card).getByText(/\(4\)/)).toBeInTheDocument();
  });

  it("exposes the landing chip after the subtitle in reading order", async () => {
    render(<AdminDashboardPage />);
    const strip = await screen.findByTestId("posture-strip");
    const subtitle = screen.getByText(/integrated monitoring across/i);
    expect(
      subtitle.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
