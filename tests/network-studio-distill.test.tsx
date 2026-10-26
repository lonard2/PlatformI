/**
 * RED: network studio distill — toolbox disclosure, disable-with-hint,
 * RAIL modes grouped by family.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { Line } from "@/types/transit";
import type { NetworkMapCanvasProps } from "@/components/admin/NetworkMapCanvas";

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

const EMPTY_LINE: Line = {
  ...TRANSIT_LINES[0],
  id: "line-test-empty",
  code: "TST",
  name: "Test Empty Line",
  polylineCoordinates: [
    { latitude: -6.2, longitude: 106.8 },
    { latitude: -6.21, longitude: 106.81 },
  ],
};

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: [...TRANSIT_LINES, EMPTY_LINE],
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      // Serve the live store so seeded lines survive the mount-time sync.
      if (method === "GET") {
        const st = useTransitStore.getState();
        const data = url.includes("/lines") ? st.allLines : st.allStops;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("network studio distill", () => {
  it("collapses secondary GIS tools behind an advanced disclosure", async () => {
    render(<AdminNetworkStudioPage />);
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(await screen.findByText(line.name));
    const summary = await screen.findByText(/advanced tools/i);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
  });

  it("disables build-from-stops with an inline hint when stops are short", async () => {
    render(<AdminNetworkStudioPage />);
    fireEvent.click(await screen.findByText("Test Empty Line"));
    fireEvent.click(await screen.findByText(/advanced tools/i));
    const build = await screen.findByRole("button", { name: /build from stops/i });
    expect(build).toBeDisabled();
    expect(screen.getByText(/needs .*2 stops/i)).toBeInTheDocument();
  });

  it("groups RAIL modes by family in the line editor", async () => {
    render(<AdminNetworkStudioPage />);
    fireEvent.click(screen.getByRole("button", { name: /new line/i }));
    const krl = await screen.findByRole("group", { name: "KRL" });
    expect(within(krl as HTMLElement).getByRole("option", { name: "KRL_BOGOR" })).toBeInTheDocument();
  });
});
