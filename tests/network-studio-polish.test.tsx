/**
 * RED: network studio polish — dialog semantics + Escape, icon labels,
 * empty-filter state, keyed copy.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { NetworkMapCanvasProps } from "@/components/admin/NetworkMapCanvas";

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
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

describe("network studio polish", () => {
  it("gives the line editor dialog semantics and closes on Escape", async () => {
    render(<AdminNetworkStudioPage />);
    fireEvent.click(screen.getByRole("button", { name: /new line/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("labels icon-only stop actions by name", async () => {
    render(<AdminNetworkStudioPage />);
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(await screen.findByText(line.name));
    expect((await screen.findAllByRole("button", { name: "Delete Station" })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Move Later in Sequence" }).length).toBeGreaterThan(0);
  });

  it("states the empty result when the line filter matches nothing", async () => {
    render(<AdminNetworkStudioPage />);
    fireEvent.change(screen.getByPlaceholderText(/search transit/i), {
      target: { value: "zzz-no-such-line" },
    });
    expect(await screen.findByText(/no lines match/i)).toBeInTheDocument();
  });

  it("renders toolbox copy from the dictionary, not inline English", async () => {
    render(<AdminNetworkStudioPage />);
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(await screen.findByText(line.name));
    expect(await screen.findByText(/advanced tools/i)).toBeInTheDocument();
    expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
  });
});
