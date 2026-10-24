/**
 * PlatformI - OCC dashboard event stream tests.
 * Advisories render as a separate prioritized list with full text;
 * telemetry pings never carry fake acknowledgement marks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/page";
import ScannerPage from "@/app/admin/scanner/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { DisruptionAlert } from "@/types/transit";

const LONG_CRITICAL: DisruptionAlert = {
  ...(DISRUPTION_ALERTS[0] as DisruptionAlert),
  id: "alert-test-critical",
  severity: "CRITICAL",
  status: "ACTIVE",
  title: "Test Critical Blockage",
  description:
    "A very long advisory description whose actionable clause sits far beyond any truncation point so a truncated render would hide it from the operator on duty",
} as DisruptionAlert;

const WARNING_ALERT: DisruptionAlert = {
  ...(DISRUPTION_ALERTS[0] as DisruptionAlert),
  id: "alert-test-warning",
  severity: "WARNING",
  status: "ACTIVE",
  title: "Test Warning Slowdown",
  description: "Short warning description",
} as DisruptionAlert;

describe("AdminDashboard event stream", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: [],
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [LONG_CRITICAL, WARNING_ALERT] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists advisories separately from telemetry with full untruncated text", async () => {
    const { container } = render(<AdminDashboardPage />);
    expect(await screen.findByText("Advisories")).toBeInTheDocument();
    expect(screen.getByText("Telemetry pings")).toBeInTheDocument();
    const advisory = await screen.findByTestId("advisory-text-alert-test-critical");
    expect(advisory).toHaveTextContent(LONG_CRITICAL.description);
    expect(advisory.className).not.toMatch(/truncate/);
  });

  it("ranks critical advisories above warnings", async () => {
    render(<AdminDashboardPage />);
    const critical = await screen.findByTestId("advisory-text-alert-test-critical");
    const warning = await screen.findByTestId("advisory-text-alert-test-warning");
    expect(
      critical.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("marks no stream row as acknowledged", async () => {
    const { container } = render(<AdminDashboardPage />);
    await screen.findByText("Advisories");
    expect(container.querySelector(".lucide-check-circle-2")).toBeNull();
  });
});

describe("Admin portal frozen module names", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    useTransitStore.setState({
      simulatedVehicles: TRANSIT_VEHICLES.slice(0, 8),
      allLines: TRANSIT_LINES,
      allStops: [],
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the scanner module identically in the hero link and the page heading", async () => {
    const { container, unmount } = render(<AdminDashboardPage />);
    await screen.findByText("Advisories");
    const heroLink = container.querySelector('a[href="/admin/scanner"]');
    expect(heroLink).not.toBeNull();
    const heroName = (heroLink as HTMLAnchorElement).textContent?.trim() ?? "";
    expect(heroName.length).toBeGreaterThan(0);
    unmount();
    render(<ScannerPage />);
    expect(await screen.findByRole("heading", { level: 2, name: heroName })).toBeInTheDocument();
  });

  it("names the alerts module identically in the hero link and the page heading", async () => {
    const { container, unmount } = render(<AdminDashboardPage />);
    await screen.findByText("Advisories");
    const heroLink = container.querySelector('a[href="/admin/alerts"]');
    expect(heroLink).not.toBeNull();
    const heroName = (heroLink as HTMLAnchorElement).textContent?.trim() ?? "";
    unmount();
    const { default: AdminAlertsPage } = await import("@/app/admin/alerts/page");
    render(<AdminAlertsPage />);
    expect(await screen.findByRole("heading", { name: heroName })).toBeInTheDocument();
  });
});
