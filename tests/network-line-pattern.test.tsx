/**
 * RED: line service-pattern fields authorable in the network modal
 * (headway, first/last departure, text color) and included in the save payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("line service pattern authoring", () => {
  it("edits headway, service hours, and text color through the modal", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/lines") && init?.method === "POST") {
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
    fireEvent.click(await screen.findByRole("button", { name: /new line/i }));
    fireEvent.change(screen.getByPlaceholderText(/m-01/i), { target: { value: "TST-99" } });
    fireEvent.change(screen.getByPlaceholderText(/mrt north-south/i), { target: { value: "Test Pattern Line" } });
    fireEvent.change(screen.getByLabelText(/headway/i), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/first departure/i), { target: { value: "04:30" } });
    fireEvent.change(screen.getByLabelText(/last departure/i), { target: { value: "23:45" } });
    fireEvent.change(screen.getByLabelText(/text color/i), { target: { value: "#000000" } });
    fireEvent.click(screen.getByRole("button", { name: /save line/i }));
    await waitFor(() => expect(posts.length).toBe(1));
    const body = posts[0] as Record<string, unknown>;
    expect(body.headwayMinutes).toBe(7);
    expect(body.firstDeparture).toBe("04:30");
    expect(body.lastDeparture).toBe("23:45");
    expect(body.textColorHex).toBe("#000000");
  });
});
