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
import { render, screen, fireEvent } from "@testing-library/react";
import {
  HubDetailSheet,
  isGatewayHub,
  getRunIdForBoardItem,
} from "@/components/inspector/HubDetailSheet";
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
});
