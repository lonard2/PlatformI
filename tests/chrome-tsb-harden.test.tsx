/**
 * RED: collapsed dot+word — collapsed system pills state their status in
 * words, not color alone.
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

describe("collapsed status words", () => {
  it("names the status on collapsed pills instead of dots alone", async () => {
    render(<TransportationSystemBar />);
    await screen.findByRole("button", { name: /mikrotrans/i });
    const words = screen.getAllByText("Normal");
    expect(words.length).toBeGreaterThan(0);
    expect(words[0].closest("button")).not.toBeNull();
  });
});
