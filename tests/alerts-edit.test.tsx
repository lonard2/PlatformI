/**
 * RED: alert bulletins editable post-broadcast — an Edit action opens a modal
 * (title/desc/line/stops/ETA) that PATCHes and updates the card in place.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminAlertsPage from "@/app/admin/alerts/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

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

const SEEDED = {
  id: "alert-test-1",
  lineId: TRANSIT_LINES[0]?.id ?? "line-tj-cor-1",
  title: "Original Title",
  description: "Original description",
  severity: "WARNING",
  status: "ACTIVE",
  affectedStops: [],
  startTime: new Date().toISOString(),
  estimatedEndTime: null,
};

function stubApi(patches: unknown[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("/api/alerts") && (!init?.method || init.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [SEEDED] }),
        } as Response);
      }
      if (String(url).includes("/api/alerts") && init?.method === "PATCH") {
        patches.push(JSON.parse(String(init.body)));
        const body = patches[patches.length - 1] as Record<string, unknown>;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { ...SEEDED, ...body } }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

describe("alert bulletin editing", () => {
  it("edits title and description through the modal", async () => {
    const patches: unknown[] = [];
    stubApi(patches);
    render(<AdminAlertsPage />);
    await screen.findByText("Original Title");
    fireEvent.click(
      await screen.findByRole("button", { name: /edit.*original title/i })
    );
    const dialog = await screen.findByRole("dialog", { name: /edit bulletin/i });
    fireEvent.change(within(dialog).getByLabelText(/alert title/i), {
      target: { value: "Updated Title" },
    });
    fireEvent.change(within(dialog).getByLabelText(/impact/i), {
      target: { value: "Updated description" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save/i }));
    await waitFor(() => expect(patches.length).toBe(1));
    const body = patches[0] as Record<string, unknown>;
    expect(body.id).toBe("alert-test-1");
    expect(body.title).toBe("Updated Title");
    expect(body.description).toBe("Updated description");
    await screen.findByText("Updated Title");
  });
});
