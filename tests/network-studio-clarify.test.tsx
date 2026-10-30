/**
 * RED: network studio clarify — one staged bar for stops + vertices,
 * Publish All + Discard All, persistent last-published receipt.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminNetworkStudioPage from "@/app/admin/network/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";
import type { NetworkMapCanvasProps } from "@/components/admin/NetworkMapCanvas";

vi.mock("@/components/admin/DynamicNetworkMap", () => ({
  DynamicNetworkMap: (props: NetworkMapCanvasProps) => (
    <div data-testid="map-stub">
      <button
        type="button"
        onClick={() => {
          const first = props.stops[0];
          if (first) props.onStopDragEnd(first.id, first.latitude + 0.001, first.longitude);
        }}
      >
        sim-drag-first-stop
      </button>
      <button
        type="button"
        onClick={() => {
          const coords = props.selectedLine?.polylineCoordinates;
          if (coords && coords.length > 0 && props.onVertexDragEnd) {
            props.onVertexDragEnd(0, coords[0].latitude + 0.001, coords[0].longitude);
          }
        }}
      >
        sim-drag-first-vertex
      </button>
    </div>
  ),
}));

interface RecordedCall {
  url: string;
  method: string;
}
let calls: RecordedCall[] = [];

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
  });
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      let data: unknown = [];
      try {
        data = init?.body ? (JSON.parse(String(init.body)) as unknown) : {};
      } catch {
        data = {};
      }
      if ((init?.method ?? "GET") === "GET") data = [];
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data }),
      } as Response);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function linePuts(): RecordedCall[] {
  return calls.filter((c) => c.url.includes("/api/network/lines") && c.method === "PUT");
}

function stopPuts(): RecordedCall[] {
  return calls.filter((c) => c.url.includes("/api/network/stops") && c.method === "PUT");
}

async function selectFirstLineWithStops(): Promise<void> {
  render(<AdminNetworkStudioPage />);
  const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
  if (!line) throw new Error("no line with stops in dataset");
  fireEvent.click(await screen.findByText(line.name));
}

function stagedBar(): HTMLElement {
  return screen.getByTestId("staged-bar");
}

describe("network studio clarify", () => {
  it("shows one bar counting staged stops and changed vertices", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    fireEvent.click(screen.getByText("sim-drag-first-vertex"));
    expect(within(stagedBar()).getByText(/staged changes \(1 stop.*1 vert/i)).toBeInTheDocument();
  });

  it("publishes stops and vertices together with a persistent receipt", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    fireEvent.click(screen.getByText("sim-drag-first-vertex"));
    fireEvent.click(within(stagedBar()).getByRole("button", { name: /sync db/i }));
    await vi.waitFor(() => expect(stopPuts().length).toBeGreaterThan(0));
    expect(linePuts().length).toBeGreaterThan(0);
    expect(await screen.findByText(/last published: 1 stop.*1 vert/i)).toBeInTheDocument();
    expect(screen.queryByTestId("staged-bar")).not.toBeInTheDocument();
  });

  it("discards staged stops and vertex edits together", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    fireEvent.click(screen.getByText("sim-drag-first-vertex"));
    fireEvent.click(within(stagedBar()).getByRole("button", { name: /^revert$/i }));
    expect(screen.queryByTestId("staged-bar")).not.toBeInTheDocument();
    expect(linePuts()).toHaveLength(0);
    expect(stopPuts()).toHaveLength(0);
  });

  it("localizes the save-stop failure instead of hardcoded English", async () => {
    useLanguageStore.setState({ language: "id" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/network/stops") && init?.method === "PUT") {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    fireEvent.click(screen.getByText("sim-drag-first-vertex"));
    fireEvent.click(within(stagedBar()).getByRole("button", { name: /sinkron db/i }));
    expect(await screen.findByText(/gagal menyimpan halte/i)).toBeInTheDocument();
    expect(screen.queryByText(/failed to save stop/i)).not.toBeInTheDocument();
  });
});
