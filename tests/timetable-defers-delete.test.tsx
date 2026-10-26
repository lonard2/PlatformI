/**
 * RED: timetable defers — delete confirmation is an in-app dialog with
 * structured identity (no window.confirm, no word-order interpolation).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const RUN: TimetableRun = {
  id: "run-del-1",
  lineId: "line-mrt-ns",
  tripCode: "M-101",
  operatorName: "PT MRT Jakarta",
  origin: "Lebak Bulus",
  destination: "Bundaran HI",
  departureTime: "08:00",
  arrivalTime: "08:35",
  daysOfWeek: [1, 2, 3, 4, 5],
};

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

async function openListWithRun(): Promise<ReturnType<typeof vi.fn>> {
  const confirmMock = vi.fn().mockReturnValue(true);
  vi.stubGlobal("confirm", confirmMock);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/timetables")) return okJson([RUN]);
      return okJson([]);
    })
  );
  render(<AdminTimetableStudioPage />);
  fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
  await screen.findByText("M-101");
  return confirmMock;
}

describe("timetable delete confirmation", () => {
  it("confirms in-app with the run identity and never calls window.confirm", async () => {
    const confirmMock = await openListWithRun();
    fireEvent.click(screen.getByRole("button", { name: "Delete Scheduled Run" }));
    const dialog = await screen.findByRole("dialog");
    expect(confirmMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText("M-101")).toBeInTheDocument();
    expect(within(dialog).getByText(/Lebak Bulus/)).toBeInTheDocument();
  });

  it("deletes on confirm and offers undo", async () => {
    await openListWithRun();
    fireEvent.click(screen.getByRole("button", { name: "Delete Scheduled Run" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete Scheduled Run" }));
    await screen.findByRole("button", { name: /^undo$/i });
    expect(screen.queryByText("M-101")).not.toBeInTheDocument();
  });

  it("keeps the run on cancel", async () => {
    await openListWithRun();
    fireEvent.click(screen.getByRole("button", { name: "Delete Scheduled Run" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("M-101")).toBeInTheDocument();
  });
});
