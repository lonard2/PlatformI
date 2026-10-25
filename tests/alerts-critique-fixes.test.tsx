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
