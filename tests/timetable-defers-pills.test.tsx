/**
 * RED: timetable defers — category pills get 44px targets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
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

describe("timetable category pills", () => {
  it("gives filter pills 44px minimum targets", async () => {
    render(<AdminTimetableStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
    const all = await screen.findByRole("button", { name: "All Modes" });
    expect(all.className).toMatch(/min-h-\[44px\]/);
    const rail = screen.getByRole("button", { name: "RAIL" });
    expect(rail.className).toMatch(/min-h-\[44px\]/);
  });
});
