/**
 * PlatformI - Alerts critique fixes (incident management on the operation portal).
 * Broadcast confirms in a modal alertdialog out of grid flow; undo live-regions
 * announce once; delete is a labeled button; amber is reserved for WARNING;
 * empty/filter states exist and sync toasts report honest aggregates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import AdminAlertsPage from "@/app/admin/alerts/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS, DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/admin/alerts",
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  } as Response);
}

function seedAlertsApi(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      String(url) === "/api/alerts"
        ? okJson({ success: true, data: DISRUPTION_ALERTS })
        : okJson({ success: true, data: [] })
    )
  );
}

function openBroadcastConfirm(): void {
  fireEvent.change(screen.getByLabelText("Alert Title"), {
    target: { value: "Depot flooding" },
  });
  fireEvent.change(screen.getByLabelText("Impact & OCC Engineering Mitigation"), {
    target: { value: "Water at the depot entrance" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Broadcast Alert to Public" }));
}

describe("Broadcast confirm modal", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    seedAlertsApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("confirms in a modal alertdialog overlay, not an inline alert", async () => {
    render(<AdminAlertsPage />);
    openBroadcastConfirm();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Out of grid flow: the backdrop overlay carries the fixed positioning.
    expect(dialog.parentElement?.className).toMatch(/fixed/);
    expect(
      within(dialog).getByRole("button", { name: "Broadcast Alert to Public" })
    ).toBeInTheDocument();
  });

  it("traps Tab inside the confirm while it is open", async () => {
    render(<AdminAlertsPage />);
    openBroadcastConfirm();
    const dialog = await screen.findByRole("alertdialog");
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe("Delete control clarity", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    seedAlertsApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("labels Delete with visible text and separates it from Resolve", async () => {
    render(<AdminAlertsPage />);
    const target = await screen.findByText(DISRUPTION_ALERTS[0].title);
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    const del = within(row).getByRole("button", { name: /^delete: /i });
    expect(del.textContent).toMatch(/^Delete/);
    expect(del.className).toMatch(/ml-2/);
  });
});

describe("Severity color honesty", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    seedAlertsApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("paints INFO bulletins cyan, never amber", async () => {
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Pemeliharaan Wesel Jalur 9 Stasiun Sentral Manggarai"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    const badge = within(row).getByText("Info");
    expect(badge.className).toMatch(/cyan/);
    expect(badge.className).not.toMatch(/amber/);
  });

  it("shows a severity legend on the feed", async () => {
    render(<AdminAlertsPage />);
    const legend = await screen.findByTestId("severity-legend");
    for (const label of ["Critical", "Warning", "Info"]) {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    }
  });

  it("keeps the delete-undo banner neutral instead of amber", async () => {
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Peringatan Gelombang Tinggi Perairan Kepulauan Seribu Utara"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(
      within(row).getByRole("button", { name: /^delete: /i })
    );
    const banner = await screen.findByText(/Disruption notice deleted:/);
    const bannerBox = banner.closest("div[class*='rounded-xl']") as HTMLElement;
    expect(bannerBox.className).toMatch(/slate/);
    expect(bannerBox.className).not.toMatch(/amber/);
  });

  it("keeps the linked-restore control indigo instead of amber", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        String(url).startsWith("/api/network/timetables")
          ? okJson({ success: true, data: [] })
          : okJson({ success: true, data: DISRUPTION_ALERTS })
      )
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /sync fleet/i }));
    const restore = await within(row).findByRole("button", {
      name: /synced \(restore\)/i,
    });
    expect(restore.className).toMatch(/indigo/);
    expect(restore.className).not.toMatch(/amber/);
  });

  it("records demote handover as WARNING, not INFO", async () => {
    const { clearShiftLog, getShiftLog } = await import(
      "@/lib/services/shiftLogService"
    );
    clearShiftLog();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) =>
        String(url).startsWith("/api/alerts") && init?.method === "PATCH"
          ? okJson({ success: true, data: {} })
          : okJson({ success: true, data: DISRUPTION_ALERTS })
      )
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(
      within(row).getByRole("button", { name: /escalate.*critical/i })
    );
    const confirms = await within(row).findAllByRole("button", {
      name: /escalate.*critical/i,
    });
    fireEvent.click(confirms[confirms.length - 1]);
    fireEvent.click(
      await within(row).findByRole("button", { name: /demote.*warning/i })
    );
    const demoteEntry = await waitFor(() => {
      const entry = getShiftLog().find((e) => e.actionType === "ALERT_DEMOTE");
      expect(entry).toBeDefined();
      return entry;
    });
    expect(demoteEntry?.summary).toMatch(/WARNING/);
    expect(demoteEntry?.summary).not.toMatch(/INFO/);
  });
});

describe("Feed empty, filter, and sync honesty", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
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

  it("shows an empty state with a CTA that focuses the authoring form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
    render(<AdminAlertsPage />);
    const empty = await screen.findByTestId("feed-empty-state");
    expect(within(empty).getByText("No bulletins to show")).toBeInTheDocument();
    fireEvent.click(
      within(empty).getByRole("button", { name: /create service alert/i })
    );
    expect(document.activeElement?.id).toBe("alert-title-input");
  });

  it("shows skeleton rows while a refresh is in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
    render(<AdminAlertsPage />);
    await screen.findByTestId("feed-empty-state");
    fireEvent.click(screen.getByRole("button", { name: /sync telemetry/i }));
    expect(screen.getAllByTestId("alert-skeleton")).toHaveLength(3);
  });

  it("filters the feed by severity and search text", async () => {
    seedAlertsApi();
    render(<AdminAlertsPage />);
    await screen.findByText(
      "Peringatan Gelombang Tinggi Perairan Kepulauan Seribu Utara"
    );
    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "INFO" },
    });
    expect(
      screen.queryByText("Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Pemeliharaan Wesel Jalur 9 Stasiun Sentral Manggarai")
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "ALL" },
    });
    fireEvent.change(screen.getByLabelText("Search title, line, or stop…"), {
      target: { value: "Manggarai" },
    });
    expect(
      screen.queryByText("Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Pemeliharaan Wesel Jalur 9 Stasiun Sentral Manggarai")
    ).toBeInTheDocument();
  });

  it("toasts honest vehicle counts when a fleet sync partially fails", async () => {
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
        ...v,
        lineId: "line-tj-cor-1",
      })),
    });
    let puts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/fleet/vehicles" && init?.method === "PUT") {
          puts += 1;
          if (puts === 1) return Promise.reject(new Error("network down"));
          return okJson({ success: true, data: {} });
        }
        if (String(url).startsWith("/api/network/timetables")) {
          return okJson({ success: true, data: [] });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /sync fleet/i }));
    const toast = await screen.findByText(/vehicles.*\(1 failed\)/i);
    expect(toast.textContent).toMatch(/\d+\/\d+ vehicles/);
  });

  it("discloses the 10-run timetable cap in the sync toast", async () => {    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
        ...v,
        lineId: "line-tj-cor-1",
      })),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).startsWith("/api/network/timetables")) {
          if (!init?.method || init.method === "GET") {
            return okJson({
              success: true,
              data: Array.from({ length: 12 }, (_, i) => ({ id: `run-${i}` })),
            });
          }
          return okJson({ success: true, data: {} });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /sync fleet/i }));
    expect(await screen.findByText(/First 10 of 12 runs linked/i)).toBeInTheDocument();
  });
});

describe("Resolve and normalize honesty", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
        ...v,
        lineId: "line-tj-cor-1",
      })),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolve emits one combined closure toast, not a fleet count that overwrites it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).startsWith("/api/network/timetables")) {
          return okJson({ success: true, data: [] });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(
      within(row).getByRole("button", { name: /mark.*resolved/i })
    );
    const toast = await screen.findByTestId("broadcast-toast");
    await waitFor(() => expect(toast.textContent).toMatch(/vehicles/));
    expect(toast.textContent).toMatch(/Resolved/);
  });

  it("normalize toast aggregates vehicle and schedule counts with failures", async () => {
    let puts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/fleet/vehicles" && init?.method === "PUT") {
          puts += 1;
          if (puts === 10) return Promise.reject(new Error("network down"));
          return okJson({ success: true, data: {} });
        }
        if (String(url).startsWith("/api/network/timetables")) {
          return okJson({ success: true, data: [] });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /sync fleet/i }));
    const restore = await within(row).findByRole("button", {
      name: /synced \(restore\)/i,
    });
    fireEvent.click(restore);
    const toast = await screen.findByTestId("broadcast-toast");
    await waitFor(() => expect(toast.textContent).toMatch(/Normalized/));
    expect(toast.textContent).toMatch(/\(1 failed\)/);
  });

  it("a failed delete execution announces nothing and restores the row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).startsWith("/api/alerts") && init?.method === "DELETE") {
          return Promise.reject(new Error("network down"));
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    vi.useFakeTimers();
    try {
      fireEvent.click(
        within(row).getByRole("button", { name: /^delete: /i })
      );
      await vi.advanceTimersByTimeAsync(50);
      (document.activeElement as HTMLElement | null)?.blur?.();
      await vi.advanceTimersByTimeAsync(6000);
    } finally {
      vi.useRealTimers();
    }
    expect(screen.getByTestId("alerts-sr-announcer")).toHaveTextContent("");
    expect(
      await screen.findByText(/Network error deleting/i)
    ).toBeInTheDocument();
  });
});

describe("Deferred minors batch", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8).map((v) => ({
        ...v,
        lineId: "line-tj-cor-1",
      })),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("announces loading once for the skeleton set, not once per row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => okJson({ success: true, data: [] }))
    );
    render(<AdminAlertsPage />);
    await screen.findByTestId("feed-empty-state");
    fireEvent.click(screen.getByRole("button", { name: /sync telemetry/i }));
    expect(
      screen.getAllByRole("status", { name: /loading bulletins/i })
    ).toHaveLength(1);
    expect(screen.getAllByTestId("alert-skeleton")).toHaveLength(3);
  });

  it("clears the finalizer so a repeated finalize announces again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).startsWith("/api/alerts") && init?.method === "DELETE") {
          return okJson({ success: true, data: {} });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    vi.useFakeTimers();
    try {
      fireEvent.click(
        within(row).getByRole("button", { name: /^delete: /i })
      );
      // Timer-callback state updates only flush inside act().
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      (document.activeElement as HTMLElement | null)?.blur?.();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.getByTestId("alerts-sr-announcer")).toHaveTextContent(
        /Deletion finalized/
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.getByTestId("alerts-sr-announcer")).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves focus to the feed after a successful broadcast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/alerts" && init?.method === "POST") {
          return okJson({
            success: true,
            data: {
              id: "alert-new-9",
              lineId: "line-tj-cor-1",
              title: "Depot drill",
              description: "Planned drill",
              severity: "INFO",
              status: "ACTIVE",
              affectedStops: [],
              startTime: new Date().toISOString(),
            },
          });
        }
        if (String(url).startsWith("/api/network/timetables")) {
          return okJson({ success: true, data: [] });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    fireEvent.change(screen.getByLabelText("Alert Title"), {
      target: { value: "Depot drill" },
    });
    fireEvent.change(screen.getByLabelText("Impact & OCC Engineering Mitigation"), {
      target: { value: "Planned drill" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Broadcast Alert to Public" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Broadcast Alert to Public" })
    );
    await screen.findByText("Depot drill");
    expect(document.activeElement?.getAttribute("data-testid")).toBe("alerts-feed");
  });

  it("focuses Cancel first, marks background inert, and locks scroll", async () => {
    seedAlertsApi();
    render(<AdminAlertsPage />);
    fireEvent.change(screen.getByLabelText("Alert Title"), {
      target: { value: "Depot drill" },
    });
    fireEvent.change(screen.getByLabelText("Impact & OCC Engineering Mitigation"), {
      target: { value: "Planned drill" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Broadcast Alert to Public" }));
    await screen.findByRole("alertdialog");
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe("Cancel")
    );
    expect(document.querySelector("[inert]")).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("rolls back the optimistic fleet update when its PUT fails", async () => {
    const failingCode = TRANSIT_VEHICLES[2].vehicleCode;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/fleet/vehicles" && init?.method === "PUT") {
          const body = JSON.parse(String(init?.body ?? "{}")) as { vehicleCode?: string };
          if (body.vehicleCode === failingCode) {
            return Promise.reject(new Error("network down"));
          }
          return okJson({ success: true, data: {} });
        }
        if (String(url).startsWith("/api/network/timetables")) {
          return okJson({ success: true, data: [] });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const failingId = TRANSIT_VEHICLES[2].id;
    const target = await screen.findByText(
      "Rekayasa Pengalihan Rute Monas Imbas Kegiatan Nasional"
    );
    const row = target.closest("div[class*='rounded-xl']") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /sync fleet/i }));
    await waitFor(() => {
      const state = useTransitStore.getState().simulatedVehicles;
      expect(state.find((v) => v.id === failingId)?.delayMinutes).toBeUndefined();
    });
    const state = useTransitStore.getState().simulatedVehicles;
    expect(
      state.find((v) => v.id === TRANSIT_VEHICLES[0].id)?.delayMinutes
    ).toBe(15);
  });
});

describe("Undo live-regions", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("marks the ticking countdown as live-off so it never re-announces", async () => {
    seedAlertsApi();
    render(<AdminAlertsPage />);
    const target = await screen.findByText(DISRUPTION_ALERTS[0].title);
    const row = target.closest("div[class*='rounded-xl']") ?? target.parentElement;
    expect(row).not.toBeNull();
    const deleteBtn = within(row as HTMLElement).getByRole("button", {
      name: /^delete: /i,
    });
    fireEvent.click(deleteBtn);
    const countdowns = await screen.findAllByTestId("undo-countdown");
    expect(countdowns.length).toBeGreaterThan(0);
    for (const cd of countdowns) {
      expect(cd).toHaveAttribute("aria-hidden", "true");
      expect(cd).toHaveAttribute("aria-live", "off");
    }
  });

  it("announces once when a deletion finalizes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).startsWith("/api/alerts") && init?.method === "DELETE") {
          return okJson({ success: true, data: {} });
        }
        return okJson({ success: true, data: DISRUPTION_ALERTS });
      })
    );
    render(<AdminAlertsPage />);
    const target = await screen.findByText(DISRUPTION_ALERTS[0].title);
    const row = target.closest("div[class*='rounded-xl']") ?? target.parentElement;
    const deleteBtn = within(row as HTMLElement).getByRole("button", {
      name: /^delete: /i,
    });
    // Freeze time only after the board is up: the tick engine must be born faked.
    vi.useFakeTimers();
    try {
      fireEvent.click(deleteBtn);
      expect(screen.getByTestId("alerts-sr-announcer")).toHaveTextContent("");
      // The undo button steals focus on click, which pauses grace by design
      // (WCAG 2.2.1): move focus away so the window can actually expire.
      await vi.advanceTimersByTimeAsync(50);
      (document.activeElement as HTMLElement | null)?.blur?.();
      await vi.advanceTimersByTimeAsync(6000);
      expect(screen.getByTestId("alerts-sr-announcer")).toHaveTextContent(
        new RegExp(`Deletion finalized: ${DISRUPTION_ALERTS[0].title}`)
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Deep-link anchors", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    seedAlertsApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes focusable broadcast and bulletin anchors for dashboard links", async () => {
    const { container } = render(<AdminAlertsPage />);
    await screen.findByText(DISRUPTION_ALERTS[0].title);
    const form = container.querySelector("#broadcast-form") as HTMLElement | null;
    expect(form).not.toBeNull();
    expect(form?.getAttribute("tabindex")).toBe("-1");
    const row = container.querySelector(`#alert-${DISRUPTION_ALERTS[0].id}`) as HTMLElement | null;
    expect(row).not.toBeNull();
    expect(row?.getAttribute("tabindex")).toBe("-1");
  });
});
