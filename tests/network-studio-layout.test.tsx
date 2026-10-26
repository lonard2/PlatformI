/**
 * RED: network studio layout — mobile List/Map switcher, 44px stop targets,
 * scrollable modal shells.
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

async function selectFirstLineWithStops(): Promise<void> {
  render(<AdminNetworkStudioPage />);
  const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
  if (!line) throw new Error("no line with stops in dataset");
  fireEvent.click(await screen.findByText(line.name));
}

describe("network studio layout", () => {
  it("switches the mobile pane between list and map", async () => {
    await selectFirstLineWithStops();
    const listPane = screen.getByTestId("studio-list-pane");
    const mapPane = screen.getByTestId("studio-map-pane");
    expect(listPane.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    fireEvent.click(screen.getByRole("button", { name: /^map$/i }));
    expect(listPane.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(mapPane.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    fireEvent.click(screen.getByRole("button", { name: /^list$/i }));
    expect(listPane.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("gives stop-row actions a 44px minimum target", async () => {
    await selectFirstLineWithStops();
    const later = screen.getAllByTitle("Move Later in Sequence")[0];
    expect(later.className).toMatch(/min-h-\[44px\]/);
    expect(later.className).toMatch(/min-w-\[44px\]/);
  });

  it("keeps the delete modal shell within the viewport scroll", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getAllByTitle("Delete Station")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toMatch(/max-h-\[90vh\]/);
    expect(dialog.className).toMatch(/overflow-y-auto/);
  });
});
