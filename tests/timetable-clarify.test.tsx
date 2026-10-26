/**
 * RED: timetable clarify — one corridor control, unified labels, keyed copy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response);
}

const RUN: TimetableRun = {
  id: "run-clarify-1",
  lineId: "line-mrt-ns",
  tripCode: "M-101",
  operatorName: "PT MRT Jakarta",
  origin: "Lebak Bulus",
  destination: "Bundaran HI",
  departureTime: "08:00",
  arrivalTime: "08:35",
  daysOfWeek: [1, 2, 3, 4, 5],
};

const TARGET_LINE_ID =
  TRANSIT_LINES.find((l) => l.id !== "line-mrt-ns" && TRANSIT_STOPS.some((s) => s.lineId === l.id))
    ?.id ?? "line-lrt-jb-cb";

const RUN_TARGET: TimetableRun = {
  ...RUN,
  id: "run-clarify-2",
  lineId: TARGET_LINE_ID,
  tripCode: "CB-101",
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
      if (String(url).includes("/api/network/timetables")) return okJson([RUN, RUN_TARGET]);
      return okJson([]);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("timetable clarify", () => {
  it("exposes one named corridor control and no duplicate picker", async () => {
    render(<AdminTimetableStudioPage />);
    await screen.findByText("M-101");
    expect(screen.getByRole("combobox", { name: "Line:" })).toBeInTheDocument();
    expect(screen.queryByText(/corridor line:/i)).not.toBeInTheDocument();
  });

  it("drives the matrix grid from the shared corridor control", async () => {
    render(<AdminTimetableStudioPage />);
    await screen.findByText("M-101");
    const picker = screen.getByRole("combobox", { name: "Line:" });
    const target = TRANSIT_LINES.find((l) => l.id === TARGET_LINE_ID);
    if (!target) throw new Error("target line missing from dataset");
    const candidates = TRANSIT_STOPS.filter((s) => s.lineId === target.id).sort(
      (a, b) => a.sequence - b.sequence
    );
    const targetStop = candidates.find((s) => !screen.queryByText(s.name));
    if (!targetStop) throw new Error("target line has no unique stop rendered");
    expect(screen.queryByText(targetStop.name)).not.toBeInTheDocument();
    fireEvent.change(picker, { target: { value: target.id } });
    expect(await screen.findByText(targetStop.name)).toBeInTheDocument();
  });

  it("uses one generate and one add label across views", async () => {
    const { rerender } = render(<AdminTimetableStudioPage />);
    await screen.findByText("M-101");
    fireEvent.click(screen.getByRole("button", { name: /stringline/i }));
    expect(await screen.findByRole("button", { name: /^batch generator$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add run$/i })).toBeInTheDocument();
    expect(screen.queryByText(/pola operasi batch/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /master list/i }));
    expect(await screen.findByRole("button", { name: /^batch generator$/i })).toBeInTheDocument();
    void rerender;
    useLanguageStore.getState().setLanguage("id");
    await screen.findByText("Semua Moda");
    expect(screen.queryByText("All Modes")).not.toBeInTheDocument();
    expect(screen.queryByText(/corridor line:/i)).not.toBeInTheDocument();
  });
});
