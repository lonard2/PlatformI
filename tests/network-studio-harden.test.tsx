/**
 * RED: network studio harden — staged stop ops, in-app delete modal, undo.
 * Map canvas is stubbed; fetch is recorded, never hits a real DB.
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
      <span data-testid="map-stop-count">{props.stops.length}</span>
      <button
        type="button"
        onClick={() => {
          const first = props.stops[0];
          if (first) props.onStopDragEnd(first.id, first.latitude + 0.001, first.longitude);
        }}
      >
        sim-drag-first-stop
      </button>
    </div>
  ),
}));

interface RecordedCall {
  url: string;
  method: string;
}
let calls: RecordedCall[] = [];

function stubFetch(): void {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

function putCalls(): RecordedCall[] {
  return calls.filter((c) => c.url.includes("/api/network/stops") && c.method === "PUT");
}

function deleteCalls(): RecordedCall[] {
  return calls.filter((c) => c.method === "DELETE");
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    simulatedVehicles: [],
  });
  stubFetch();
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

describe("network studio harden", () => {
  it("stages a stop drag locally without PUTing", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    expect(await screen.findByText(/staged changes \(1 stop/i)).toBeInTheDocument();
    expect(putCalls()).toHaveLength(0);
  });

  it("restores the dragged stop on undo", async () => {
    await selectFirstLineWithStops();
    fireEvent.click(screen.getByText("sim-drag-first-stop"));
    await screen.findByText(/staged changes \(1 stop/i);
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));
    expect(screen.queryByText(/staged changes \(/i)).not.toBeInTheDocument();
    expect(putCalls()).toHaveLength(0);
  });

  it("confirms a stop delete in-app and publishes only on demand", async () => {
    await selectFirstLineWithStops();
    const deletes = screen.getAllByTitle("Delete Station");
    fireEvent.click(deletes[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/undo within 10 seconds/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /delete station/i }));
    expect(await screen.findByText(/staged changes \(1 stop/i)).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
    const strip = screen.getByText(/staged changes \(1 stop/i).closest("div");
    if (!strip) throw new Error("staged strip missing");
    fireEvent.click(within(strip.parentElement as HTMLElement).getByRole("button", { name: /sync db/i }));
    await vi.waitFor(() => expect(deleteCalls()).toHaveLength(1));
  });

  it("requires typing the line code before a line delete", async () => {
    await selectFirstLineWithStops();
    const line = TRANSIT_LINES.find((l) => TRANSIT_STOPS.some((s) => s.lineId === l.id));
    if (!line) throw new Error("no line with stops in dataset");
    fireEvent.click(screen.getByTitle("Delete Line"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/deletes \d+ stops and affects \d+ vehicles/i)).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: /^delete line$/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/type .* to confirm/i), {
      target: { value: line.code },
    });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await vi.waitFor(() => expect(deleteCalls()).toHaveLength(1));
  });
});
