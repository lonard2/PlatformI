/**
 * RED: transport bar split control — the sector chip states its bar-only
 * scope, and the collapse toggle exposes its real (possibly overridden)
 * expanded state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
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

describe("transport bar split control", () => {
  it("tells the bar scope apart from the map eye on sector chips", async () => {
    render(<TransportationSystemBar />);
    const scoped = await screen.findAllByTitle(/in this bar only/i);
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped[0].getAttribute("aria-pressed")).not.toBeNull();
  });

  it("exposes the real expanded state on collapse toggles", async () => {
    render(<TransportationSystemBar />);
    const toggles = await screen.findAllByRole("button", {
      name: /show this sector's items|hide this sector's items/i,
    });
    expect(toggles.length).toBeGreaterThan(0);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute("aria-expanded");
    }
  });
});
