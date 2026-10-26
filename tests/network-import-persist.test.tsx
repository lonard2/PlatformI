/**
 * RED: GeoJSON-imported stops persist via direct POST (validate-then-write)
 * with a counted toast, instead of vanishing from local-only state.
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

const GEOJSON = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [106.8, -6.2] },
      properties: { name: "Imported Halte A", code: "IMP-A" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [106.81, -6.21] },
      properties: { name: "Imported Halte B", code: "IMP-B" },
    },
  ],
});

beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
  });
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function mockFetchPost(postImpl: (url: string, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("/api/network/stops") && init?.method === "POST") {
        return postImpl(url, init);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

function okEcho(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data: body }),
  } as Response);
}

async function openLineAndImport(): Promise<HTMLElement> {
  render(<AdminNetworkStudioPage />);
  const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
  if (!line) throw new Error("no line with stops in dataset");
  fireEvent.click(await screen.findByText(line.name));
  const file = new File([GEOJSON], "import.geojson", { type: "application/json" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return within(document.body).getByTestId("map-stub") as HTMLElement;
}

describe("geojson import persistence", () => {
  it("POSTs imported stops instead of keeping them local-only", async () => {
    const posts: unknown[] = [];
    mockFetchPost(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      posts.push(body);
      return okEcho({ ...body, id: `stop-imported-${posts.length}` });
    });
    await openLineAndImport();
    await waitFor(() => expect(posts.length).toBe(2));
    expect(JSON.stringify(posts)).toMatch(/IMP-A/);
    expect(JSON.stringify(posts)).toMatch(/IMP-B/);
  });

  it("reports a counted failure instead of silent loss", async () => {
    let calls = 0;
    mockFetchPost(async () => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ success: false, error: "db down" }),
        } as Response);
      }
      return okEcho({ id: "stop-imported-2" });
    });
    await openLineAndImport();
    await screen.findByText(/1 of 2|1 \/ 2/i);
  });
});
