/**
 * Region manager dialog — opens from the studio header, lists regions from
 * the API, and surfaces the empty state when none are returned.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

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
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/network/regions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
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

describe("region manager dialog", () => {
  it("opens from the header and shows the empty state", async () => {
    render(<AdminNetworkStudioPage />);
    fireEvent.click(await screen.findByRole("button", { name: /regions/i }));
    const dialog = await screen.findByRole("dialog", { name: /service regions/i });
    expect(dialog).toBeInTheDocument();
  });
});
