/**
 * RED: top-bar priority — alerts promoted by severity with a numeric badge,
 * AI demoted to a neutral pill.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { DisruptionAlert } from "@/types/transit";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));

vi.mock("@/components/navigation/TransportationSystemBar", () => ({
  TransportationSystemBar: () => <div data-testid="tsb-stub" />,
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response);
}

function critAlert(id: string): DisruptionAlert {
  return {
    id,
    lineId: "line-mrt-ns",
    title: "Signal failure",
    description: "Peak disruption",
    severity: "CRITICAL",
    status: "ACTIVE",
    affectedStops: [],
    startTime: new Date().toISOString(),
  };
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    activeAlerts: [],
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => okJson([]))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("top-bar priority", () => {
  it("promotes critical alerts with a severity badge", async () => {
    useTransitStore.setState({ activeAlerts: [critAlert("a1"), critAlert("a2")] });
    render(<Home />);
    const badge = await screen.findByRole("status", { name: /2 active/i });
    expect(badge).toHaveTextContent("2");
    const alertsBtn = badge.closest("button") as HTMLElement;
    expect(alertsBtn.className).toMatch(/rose/);
    expect(alertsBtn.textContent ?? "").not.toMatch(/\(2\)/);
  });

  it("shows no badge when nothing is active", async () => {
    render(<Home />);
    await screen.findByRole("button", { name: /service status/i });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("demotes the AI pill to neutral", async () => {
    render(<Home />);
    const ai = await screen.findByRole("button", { name: /ai travel assistant/i });
    expect(ai.className).not.toMatch(/bg-cyan-500\/15/);
    expect(ai.className).not.toMatch(/text-cyan-300/);
  });
});
