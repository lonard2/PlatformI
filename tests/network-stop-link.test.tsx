/**
 * RED: stop link/facility/platform fields authorable in the network modal
 * (connectedLineIds, facilities, platformType) and included in the save payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: () => <div data-testid="map-stub" />,
}));

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stop link authoring", () => {
  it("edits platform type, connected lines, and facilities through the modal", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/stops") && init?.method === "POST") {
          posts.push(JSON.parse(String(init.body)));
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: posts[posts.length - 1] }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    render(<AdminNetworkStudioPage />);
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(await screen.findByText(line.name));
    fireEvent.click(await screen.findByRole("button", { name: /add stop/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText(/bundaran hi/i), {
      target: { value: "Link Test Halte" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText(/e\.g\. bhi/i), {
      target: { value: "LNK" },
    });
    fireEvent.change(within(dialog).getByLabelText(/platform type/i), {
      target: { value: "SIDE" },
    });
    fireEvent.change(within(dialog).getByLabelText(/connected lines/i), {
      target: { value: `${TRANSIT_LINES[0].code}, ${TRANSIT_LINES[1].code}` },
    });
    fireEvent.change(within(dialog).getByLabelText(/^facilities/i), {
      target: { value: "TOILET, PRAYER_ROOM" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save stop/i }));
    await waitFor(() => expect(posts.length).toBe(1));
    const body = posts[0] as Record<string, unknown>;
    expect(body.platformType).toBe("SIDE");
    expect(body.connectedLineIds).toEqual([TRANSIT_LINES[0].code, TRANSIT_LINES[1].code]);
    expect(body.facilities).toEqual(["TOILET", "PRAYER_ROOM"]);
  });
});
