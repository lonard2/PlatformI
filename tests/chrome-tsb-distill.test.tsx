/**
 * RED: transport bar distill — capped tray with show-all and per-item
 * query memory instead of an 80-card wall with amnesia.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
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

function trayById(id: string): HTMLElement {
  // AnimatePresence revives same-key trays, so DOM position is unreliable
  // headlessly (exiting trays linger). IDs identify the live tray.
  const el = document.getElementById(`system-tray-${id}`);
  if (!el) throw new Error(`tray ${id} missing`);
  return el;
}

async function openMikrotransTray(): Promise<HTMLElement> {
  render(<TransportationSystemBar />);
  fireEvent.click(await screen.findByRole("button", { name: /mikrotrans \(jaklingko/i }));
  return trayById("sys-mikrotrans");
}

describe("transportation tray distill", () => {
  it("caps the initial tray with a show-all control", async () => {
    const tray = await openMikrotransTray();
    const cards = within(tray).getAllByTestId("tray-card");
    expect(cards.length).toBeLessThanOrEqual(12);
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(within(tray).getByRole("button", { name: /show all/i }));
    expect(within(tray).getAllByTestId("tray-card").length).toBeGreaterThan(12);
  });

  it("remembers the search query per system, not per open", async () => {
    const tray = await openMikrotransTray();
    const search = within(tray).getByPlaceholderText(/search routes/i);
    fireEvent.change(search, { target: { value: "jak.31" } });
    expect(within(tray).getAllByTestId("tray-card")).toHaveLength(1);
    // Switch away and back: the query is preserved for this system.
    fireEvent.click(await screen.findByRole("button", { name: /transjakarta brt/i }));
    fireEvent.click(await screen.findByRole("button", { name: /mikrotrans/i }));
    const retray = trayById("sys-mikrotrans");
    expect((within(retray).getByPlaceholderText(/search routes/i) as HTMLInputElement).value).toBe("jak.31");
    expect(within(retray).getAllByTestId("tray-card")).toHaveLength(1);
  });
});
