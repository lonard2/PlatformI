/**
 * RED: static-vs-DB drift guards — every timetable run, stop line, and stop
 * link resolves to a real transit line; and trays whose corridors lack map
 * geometry say so up front (MikroTrans schedules vs live map coverage).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  TransportationSystemBar,
  SYSTEM_GROUPS,
} from "@/components/navigation/TransportationSystemBar";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { DEFAULT_TIMETABLE_RUNS } from "@/lib/data/defaultTimetables";
import { useLanguageStore } from "@/lib/i18n";

describe("static drift guards", () => {
  it("every timetable run points at a real line", () => {
    const ids = new Set(TRANSIT_LINES.map((l) => l.id));
    const dangling = DEFAULT_TIMETABLE_RUNS.filter((r) => !ids.has(r.lineId));
    expect(dangling.map((r) => `${r.id} -> ${r.lineId}`)).toEqual([]);
  });

  it("every stop line and link resolves to a real line", () => {
    const ids = new Set(TRANSIT_LINES.map((l) => l.id));
    expect(TRANSIT_STOPS.filter((s) => !ids.has(s.lineId)).map((s) => s.id)).toEqual([]);
    const badLinks = new Set<string>();
    for (const s of TRANSIT_STOPS) {
      for (const c of s.connectedLineIds || []) {
        if (!ids.has(c)) badLinks.add(`${s.id} -> ${c}`);
      }
    }
    expect([...badLinks]).toEqual([]);
  });

  it("every bar corridor lineId resolves to a real line", () => {
    const ids = new Set(TRANSIT_LINES.map((l) => l.id));
    const dangling: string[] = [];
    for (const g of SYSTEM_GROUPS) {
      for (const item of g.items) {
        for (const c of item.corridorsOrBuildings) {
          if (c.lineId && !ids.has(c.lineId)) dangling.push(`${c.code} -> ${c.lineId}`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });
});

describe("tray map-coverage flag", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
    useTransitStore.setState({
      allLines: TRANSIT_LINES,
      allStops: TRANSIT_STOPS,
      activeAlerts: [],
      activeDrawer: null,
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

  it("states live-map coverage when corridors lack geometry", async () => {
    render(<TransportationSystemBar />);
    fireEvent.click(await screen.findByRole("button", { name: /mikrotrans/i }));
    const tray = document.getElementById("system-tray-sys-mikrotrans") as HTMLElement;
    const note = await within(tray).findByText(/live map for \d+ of \d+/i);
    expect(note).toBeInTheDocument();
  });
});
