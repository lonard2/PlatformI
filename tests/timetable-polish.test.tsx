/**
 * RED: timetable polish — labelled 44px row actions, paginated registry
 * with sticky actions, 44px day toggles.
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
  id: "run-polish-1",
  lineId: "line-mrt-ns",
  tripCode: "M-101",
  operatorName: "PT MRT Jakarta",
  origin: "Lebak Bulus",
  destination: "Bundaran HI",
  departureTime: "08:00",
  arrivalTime: "08:35",
  daysOfWeek: [1, 2, 3, 4, 5],
};

function manyRuns(n: number): TimetableRun[] {
  return Array.from({ length: n }, (_, i) => ({
    ...RUN,
    id: `run-bulk-${i}`,
    tripCode: `M-${String(101 + i).padStart(3, "0")}`,
  }));
}

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response);
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openList(runs: TimetableRun[] = [RUN]): Promise<void> {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/timetables")) return okJson(runs);
      return okJson([]);
    })
  );
  render(<AdminTimetableStudioPage />);
  fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
  await screen.findByText("M-101");
}

describe("timetable polish", () => {
  it("labels row actions and gives them 44px targets", async () => {
    await openList();
    const edits = screen.getAllByRole("button", { name: "Edit Scheduled Run" });
    expect(edits.length).toBeGreaterThan(0);
    expect(edits[0].className).toMatch(/min-h-\[44px\]/);
    const deletes = screen.getAllByRole("button", { name: "Delete Scheduled Run" });
    expect(deletes[0].className).toMatch(/min-h-\[44px\]/);
  });

  it("paginates the registry at fifty rows with sticky actions", async () => {
    await openList(manyRuns(55));
    expect(screen.getByText("M-101")).toBeInTheDocument();
    expect(screen.queryByText("M-151")).not.toBeInTheDocument();
    expect(screen.getByTestId("registry-header")).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(await screen.findByText("M-151")).toBeInTheDocument();
    expect(screen.queryByText("M-101")).not.toBeInTheDocument();
  });

  it("gives modal day toggles 44px targets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("/api/network/timetables")) return okJson([RUN]);
        return okJson([]);
      })
    );
    render(<AdminTimetableStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^add run$/i }));
    const monday = await screen.findByRole("button", { name: /^monday$/i });
    expect(monday.className).toMatch(/min-h-\[44px\]/);
  });
});
