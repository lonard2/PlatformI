/**
 * RED: timetable shape — sectioned modal, dirty guard, native time inputs.
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
  id: "run-shape-1",
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
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/timetables")) return okJson([RUN]);
      return okJson([]);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openCreateModal(): Promise<HTMLElement> {
  render(<AdminTimetableStudioPage />);
  fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
  fireEvent.click(await screen.findByRole("button", { name: /add run/i }));
  return screen.getByRole("dialog");
}

describe("timetable shape", () => {
  it("groups the run form into named sections", async () => {
    const dialog = await openCreateModal();
    for (const name of [/^service$/i, /^timing$/i, /^boarding$/i, /^operation$/i]) {
      expect(within(dialog).getByRole("group", { name })).toBeInTheDocument();
    }
  });

  it("blocks close on dirty and discards only on confirm", async () => {
    const dialog = await openCreateModal();
    expect(within(dialog).queryByTestId("form-dirty-dot")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByPlaceholderText(/g1012/i), {
      target: { value: "M-999" },
    });
    expect(await within(dialog).findByTestId("form-dirty-dot")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText(/discard unsaved changes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^discard$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes a clean edit without a discard prompt", async () => {
    render(<AdminTimetableStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
    fireEvent.click(await screen.findByRole("button", { name: /edit scheduled run/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses native time inputs for departure and arrival", async () => {
    const dialog = await openCreateModal();
    const times = dialog.querySelectorAll('input[type="time"]');
    expect(times.length).toBe(2);
  });
});
