/**
 * PlatformI - Alerts critique fixes (incident management on the operation portal).
 * Broadcast confirms in a modal alertdialog out of grid flow; undo live-regions
 * announce once; delete is a labeled button; amber is reserved for WARNING;
 * empty/filter states exist and sync toasts report honest aggregates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
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
      name: /delete disruption bulletin for/i,
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
      name: /delete disruption bulletin for/i,
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
