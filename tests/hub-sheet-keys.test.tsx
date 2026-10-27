/**
 * REGRESSION: HubDetailSheet must not emit duplicate-key warnings.
 * The sheet's AnimatePresence previously wrapped two unkeyed children
 * (sheet container + timetable dialog), so framer-motion mounted two
 * keyless PresenceChildren and React warned about duplicate "" keys.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { HubDetailSheet } from "@/components/inspector/HubDetailSheet";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { DEFAULT_TIMETABLE_RUNS } from "@/lib/data/defaultTimetables";
import { useLanguageStore } from "@/lib/i18n";

describe("hub sheet keys", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  const dupes: string[] = [];

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
    dupes.length = 0;
    spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (args.map(String).join(" ").includes("same key")) {
        dupes.push(args.map(String).join(" "));
      }
    });
  });

  afterEach(() => {
    spy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("renders the gateway board without duplicate keys", async () => {
    render(<HubDetailSheet stopId="stop-kai-gmr" />);
    await screen.findByText(/KA-01/i);
    await new Promise((r) => setTimeout(r, 500));
    expect(dupes).toEqual([]);
  });

  it("renders departures without duplicate keys", async () => {
    render(<HubDetailSheet stopId="stop-mrt-blm" />);
    await screen.findByText("Stasiun Blok M BCA");
    await new Promise((r) => setTimeout(r, 500));
    expect(dupes).toEqual([]);
  });
});
