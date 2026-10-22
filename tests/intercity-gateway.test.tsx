/**
 * PlatformI - Intercity Gateway Boards Tests (Task 3)
 * Gateway arrival/departure boards per hub with follow-trip action.
 *
 * Adjustments vs the plan brief: the brief's `stopId="stop-gambir"` does not
 * exist in the dataset, so the real Gambir stop id `stop-kai-gmr` is used
 * (the `stopId: string | null` prop signature itself is real). The suite runs
 * in the `en` locale so the Follow action matches /follow/i verbatim.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  HubDetailSheet,
  isGatewayHub,
  getRunIdForBoardItem,
} from "@/components/inspector/HubDetailSheet";
import {
  IntercitySchematic,
  computeSchematicFraction,
  getSchematicStops,
} from "@/components/inspector/IntercitySchematic";
import type { TimetableRun } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";
import { TRANSIT_STOPS, TRANSIT_LINES } from "@/lib/data/jakarta-dataset";
import { DEFAULT_TIMETABLE_RUNS } from "@/lib/data/defaultTimetables";
import type { Stop, DepartureBoardItem } from "@/types/transit";

describe("Intercity gateway boards", () => {
  beforeEach(() => {
    useTransitStore.setState({
      simulatedVehicles: [],
      allStops: TRANSIT_STOPS,
      allLines: TRANSIT_LINES,
      selectedVehicleId: null,
      selectedStopId: null,
      selectedLineId: null,
      activeDrawer: null,
    });
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: DEFAULT_TIMETABLE_RUNS }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders gateway board rows with follow action", async () => {
    render(<HubDetailSheet stopId="stop-kai-gmr" />);
    expect(await screen.findByText(/KA-01/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /follow/i })
    ).toBeInTheDocument();
  });

  it("follow action carries the run id and toggles following state", async () => {
    render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    const followButton = screen.getByRole("button", {
      name: /follow this trip/i,
    });
    expect(followButton.getAttribute("data-run-id")).toBe("run-kai-01");
    expect(followButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(followButton);
    expect(
      screen.getByRole("button", { name: /following/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows an explicit gateway empty state when no departures match", async () => {
    render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "zzz-no-such-trip" } });
    expect(
      await screen.findByText(/no gateway trips scheduled/i)
    ).toBeInTheDocument();
  });

  it("resets the followed run when another hub opens", async () => {
    const { rerender } = render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    fireEvent.click(
      screen.getByRole("button", { name: /follow this trip/i })
    );
    expect(
      screen.getByRole("button", { name: /^following/i })
    ).toHaveAttribute("aria-pressed", "true");
    rerender(<HubDetailSheet stopId="stop-kai-pse" />);
    await screen.findByRole("heading", { name: /Pasar Senen/i });
    expect(
      screen.queryByRole("button", { name: /^following/i })
    ).not.toBeInTheDocument();
  });

  it("keeps follow state on the correct row when the board is filtered", async () => {
    render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    fireEvent.click(
      screen.getByRole("button", { name: /follow this trip/i })
    );
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "gambir" },
    });
    const following = await screen.findByRole("button", {
      name: /^following/i,
    });
    expect(following.getAttribute("data-run-id")).toBe("run-kai-01");
    expect(
      screen.queryAllByRole("button", { name: /^following/i })
    ).toHaveLength(1);
  });
  it("recognises gateway hubs and extracts run ids from board items", () => {
    const gambir = TRANSIT_STOPS.find((s) => s.id === "stop-kai-gmr") as Stop;
    const dukuhAtas = TRANSIT_STOPS.find((s) => s.id === "stop-mrt-dka") as Stop;
    expect(isGatewayHub(gambir)).toBe(true);
    expect(isGatewayHub(dukuhAtas)).toBe(false);
    expect(isGatewayHub(null)).toBe(false);
    expect(
      getRunIdForBoardItem({ tripId: "run-run-kai-01" } as DepartureBoardItem)
    ).toBe("run-kai-01");
    expect(
      getRunIdForBoardItem({ tripId: "trip-line-x-0" } as DepartureBoardItem)
    ).toBeNull();
  });

  it("renders schematic stops with live position", () => {
    // run-wh-1012 is the Whoosh trip G1012 Halim HSR -> Tegalluar.
    render(<IntercitySchematic runId="run-wh-1012" fraction={0.5} />);
    expect(screen.getByText(/Halim/i)).toBeInTheDocument();
  });

  it("interpolates schematic fraction from timetable times clamped to 0..1", () => {
    const run = {
      id: "run-kai-01",
      lineId: "line-kai-intercity",
      tripCode: "KA-01",
      origin: "Stasiun Gambir (GMR)",
      destination: "Surabaya Pasarturi (SBI)",
      departureTime: "08:20",
      arrivalTime: "16:30",
      operatorName: "PT Kereta Api Indonesia (Persero)",
    } as TimetableRun;
    const at = (hhmm: string) =>
      new Date(`2026-01-15T${hhmm}:00+07:00`).getTime();
    expect(computeSchematicFraction(run, at("08:20"))).toBe(0);
    expect(computeSchematicFraction(run, at("12:25"))).toBeCloseTo(0.5, 5);
    expect(computeSchematicFraction(run, at("16:30"))).toBe(1);
    expect(computeSchematicFraction(run, at("06:00"))).toBe(0);
    expect(computeSchematicFraction(run, at("20:00"))).toBe(1);
    expect(
      computeSchematicFraction(
        { ...run, departureTime: "24:30" } as TimetableRun,
        at("12:25")
      )
    ).toBe(0);
    expect(
      computeSchematicFraction(
        { ...run, arrivalTime: "08:20" } as TimetableRun,
        at("12:25")
      )
    ).toBe(0);
  });

  it("handles overnight timetable windows in schematic fraction", () => {
    const run = {
      id: "run-night",
      lineId: "line-tj-cor-1",
      tripCode: "TJ-108",
      origin: "Halte Blok M",
      destination: "Halte Kota",
      departureTime: "23:30",
      arrivalTime: "00:25",
      operatorName: "PT Transportasi Jakarta",
    } as TimetableRun;
    const at = (day: string, hhmm: string) =>
      new Date(`${day}T${hhmm}:00+07:00`).getTime();
    expect(
      computeSchematicFraction(run, at("2026-01-15", "23:50"))
    ).toBeCloseTo(20 / 55, 5);
    expect(
      computeSchematicFraction(run, at("2026-01-16", "00:10"))
    ).toBeCloseTo(40 / 55, 5);
    expect(computeSchematicFraction(run, at("2026-01-15", "12:00"))).toBe(0);
  });

  it("renders intermediate stop ticks from stopTimesJson when present", () => {
    const run = {
      id: "run-stops",
      lineId: "line-kai-intercity",
      tripCode: "KA-99",
      origin: "Stasiun Gambir (GMR)",
      destination: "Surabaya Pasarturi (SBI)",
      departureTime: "08:20",
      arrivalTime: "16:30",
      operatorName: "PT Kereta Api Indonesia (Persero)",
      stopTimes: [
        {
          stopId: "s1",
          stopName: "Stasiun Gambir",
          stopSequence: 1,
          arrivalTime: "08:20",
          departureTime: "08:25",
        },
        {
          stopId: "s2",
          stopName: "Cirebon",
          stopSequence: 2,
          arrivalTime: "11:00",
          departureTime: "11:05",
        },
        {
          stopId: "s3",
          stopName: "Surabaya Pasarturi",
          stopSequence: 3,
          arrivalTime: "16:30",
          departureTime: "16:30",
        },
      ],
    } as TimetableRun;
    expect(getSchematicStops(run, run.id)).toEqual([
      "Stasiun Gambir",
      "Cirebon",
      "Surabaya Pasarturi",
    ]);
    const at = (hhmm: string) =>
      new Date(`2026-01-15T${hhmm}:00+07:00`).getTime();
    // StopTimes window (08:25 -> 16:30) governs, not the header times.
    expect(computeSchematicFraction(run, at("08:25"))).toBe(0);
    expect(computeSchematicFraction(run, at("08:20"))).toBe(0);
  });

  it("embeds the schematic in the followed trip detail", async () => {
    const { container } = render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    const followButton = container.querySelector(
      'button[data-run-id="run-kai-01"]'
    );
    if (!followButton) throw new Error("follow button not found");
    fireEvent.click(followButton);
    const rowButton = screen.getByText("KA-01").closest("button");
    if (!rowButton) throw new Error("trip row button not found");
    fireEvent.click(rowButton);
    const schematic = screen.getByTestId("intercity-schematic");
    expect(schematic).toBeInTheDocument();
    expect(within(schematic).getByRole("img")).toBeInTheDocument();
    expect(schematic).toHaveTextContent("Surabaya Pasarturi");
  });
});
