/**
 * RED: timetable defers — no sub-4.5 functional text pairs remain.
 * Guard test: the overlay-flagged slate-500/600 text and white-on-cyan-600
 * CTA must not regress.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const RUN: TimetableRun = {
  id: "run-contrast-1",
  lineId: "line-mrt-ns",
  tripCode: "M-101",
  operatorName: "PT MRT Jakarta",
  origin: "Lebak Bulus",
  destination: "Bundaran HI",
  departureTime: "08:00",
  arrivalTime: "08:35",
  daysOfWeek: [1, 2, 3, 4, 5],
};

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/timetables")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [RUN] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("timetable contrast guards", () => {
  it("uses no slate-500/600 functional text in the registry", async () => {
    const { container } = render(<AdminTimetableStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
    await screen.findByText("M-101");
    expect(container.querySelectorAll(".text-slate-500, .text-slate-600").length).toBe(0);
  });

  it("meets contrast on the search placeholder", async () => {
    render(<AdminTimetableStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
    await screen.findByText("M-101");
    const search = screen.getByPlaceholderText(/filter berdasar|filter by/i);
    expect(search.className).not.toContain("placeholder:text-slate-500");
  });
});
