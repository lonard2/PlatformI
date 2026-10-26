/**
 * RED: homepage typeset — legible answer metrics, valid chip padding,
 * coverage note with icon at readable contrast.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@/components/map/DynamicMap", () => ({
  DynamicMap: () => <div data-testid="map-stub" />,
}));

vi.mock("@/components/navigation/TransportationSystemBar", () => ({
  TransportationSystemBar: () => <div data-testid="tsb-stub" />,
}));

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data }),
  } as Response);
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    activeAlerts: [],
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => okJson([]))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

async function openAnswer(): Promise<HTMLElement> {
  window.history.replaceState(
    null,
    "",
    `/?from=${encodeURIComponent("Stasiun Blok M BCA")}&to=${encodeURIComponent("Stasiun Dukuh Atas BNI")}`
  );
  render(<Home />);
  await screen.findByText("Direct Route");
  const dialog = await screen.findByRole("dialog", { name: /find route/i });
  return dialog;
}

describe("homepage typeset", () => {
  it("uses valid chip padding in the answer card", async () => {
    const dialog = await openAnswer();
    expect(dialog.querySelectorAll('[class*="py-0.2"]').length).toBe(0);
  });

  it("renders metric labels and values at legible sizes", async () => {
    const dialog = await openAnswer();
    const timeLabel = dialog.querySelectorAll("*");
    void timeLabel;
    const estTime = Array.from(dialog.querySelectorAll("*")).find(
      (el) => el.textContent === "Est. Time" && el.children.length === 0
    ) as HTMLElement;
    expect(estTime.className).not.toMatch(/text-\[10px\]/);
    const value = Array.from(dialog.querySelectorAll(".tabular-nums.font-bold")).find((el) =>
      /min/.test(el.textContent ?? "")
    ) as HTMLElement;
    expect(value.className).toMatch(/text-sm/);
  });

  it("gives the coverage note an icon and readable contrast", async () => {
    const dialog = await openAnswer();
    const note = Array.from(dialog.querySelectorAll("p")).find((el) =>
      /map-only/i.test(el.textContent ?? "")
    ) as HTMLElement;
    expect(note).toBeDefined();
    expect(note.className).toContain("text-slate-400");
    expect(note.querySelector("svg")).not.toBeNull();
  });
});
