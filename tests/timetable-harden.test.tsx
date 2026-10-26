/**
 * RED: timetable harden — visible load errors with retry, surfaced
 * in-cell/delete failures, merge-mode trip-code conflicts block publish.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminTimetableStudioPage from "@/app/admin/timetables/page";
import { BatchScheduleModal } from "@/components/admin/BatchScheduleModal";
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

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("timetable load errors", () => {
  it("renders the fetch failure with a retry that refetches", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("db down"));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminTimetableStudioPage />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/db down/i);
    const gets = () => fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/network/timetables") && !c[1]).length;
    const before = gets();
    fireEvent.click(within(alert).getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(gets()).toBeGreaterThan(before));
  });

  it("clears the error banner after a successful refetch", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockImplementation(() => okJson([]));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminTimetableStudioPage />);
    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: /refresh/i }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("timetable action errors", () => {
  it("surfaces a failed delete instead of failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/timetables") && !init) {
          return okJson([
            {
              id: "run-del-1",
              lineId: "line-mrt-ns",
              tripCode: "M-101",
              operatorName: "PT MRT Jakarta",
              origin: "Lebak Bulus",
              destination: "Bundaran HI",
              departureTime: "08:00",
              arrivalTime: "08:35",
              daysOfWeek: [1, 2, 3, 4, 5],
            } satisfies TimetableRun,
          ]);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: false, error: "delete rejected" }),
        } as Response);
      })
    );
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    try {
      render(<AdminTimetableStudioPage />);
      fireEvent.click(await screen.findByRole("button", { name: /master list/i }));
      fireEvent.click(await screen.findByRole("button", { name: /delete scheduled run/i }));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent ?? "").toMatch(/delete rejected/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces a failed in-cell matrix save instead of failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/timetables") && !init) {
          return okJson([
            {
              id: "run-shift-1",
              lineId: "line-mrt-ns",
              tripCode: "M-102",
              operatorName: "PT MRT Jakarta",
              origin: "Lebak Bulus",
              destination: "Bundaran HI",
              departureTime: "08:05",
              arrivalTime: "08:40",
              daysOfWeek: [1, 2, 3, 4, 5],
            } satisfies TimetableRun,
          ]);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: false, error: "save rejected" }),
        } as Response);
      })
    );
    render(<AdminTimetableStudioPage />);
    // Matrix view is default; shift the first run via the grid's -5m/+5m control.
    fireEvent.click(await screen.findByRole("button", { name: /\+5m/i }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/save rejected/i);
  });
});

describe("timetable merge conflicts", () => {
  it("blocks merge publish when generated codes already exist", async () => {
    const existing: TimetableRun = {
      id: "run-existing-1",
      lineId: "line-mrt-ns",
      tripCode: "M-1-101",
      operatorName: "PT MRT Jakarta",
      origin: "Lebak Bulus",
      destination: "Bundaran HI",
      departureTime: "06:00",
      arrivalTime: "06:35",
      daysOfWeek: [1, 2, 3, 4, 5],
    };
    render(
      <BatchScheduleModal
        isOpen
        onClose={() => {}}
        lines={TRANSIT_LINES}
        allStops={TRANSIT_STOPS}
        initialLineId="line-mrt-ns"
        existingRuns={[existing]}
        onRunsGenerated={() => {}}
      />
    );
    expect(await screen.findByText(/already exist/i)).toBeInTheDocument();
    const publish = await screen.findByRole("button", { name: /publish/i });
    expect(publish).toBeDisabled();
  });
});
