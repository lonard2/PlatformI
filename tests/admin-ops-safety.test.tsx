/**
 * PlatformI - OCC operational safety tests.
 * Broadcasts confirm blast radius before posting; gate DENIED results
 * persist until dismissed and every scan leaves a visible shift-log receipt.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import AdminAlertsPage from "@/app/admin/alerts/page";
import ScannerPage from "@/app/admin/scanner/page";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { useLanguageStore } from "@/lib/i18n";

function seedStore(): void {
  useTransitStore.setState({
    simulatedVehicles: TRANSIT_VEHICLES,
    allLines: TRANSIT_LINES,
    allStops: TRANSIT_STOPS,
    selectedVehicleId: null,
    selectedStopId: null,
    activeDrawer: null,
  });
}

describe("Broadcast confirmation", () => {
  let posted: RequestInit[];

  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    seedStore();
    posted = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url) === "/api/alerts" && init?.method === "POST") {
          posted.push(init);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                id: "alert-new-1",
                lineId: "line-tj-cor-1",
                title: "Test blockage",
                description: "Flooding at the depot entrance",
                severity: "CRITICAL",
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for confirmation showing the blast radius before posting", async () => {
    render(<AdminAlertsPage />);
    fireEvent.change(screen.getByLabelText(/alert title/i), {
      target: { value: "Test blockage" },
    });
    fireEvent.change(screen.getByLabelText(/impact & occ/i), {
      target: { value: "Flooding at the depot entrance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /broadcast alert to public/i }));
    const dialog = await screen.findByRole("alert", { name: /confirm broadcast/i });
    expect(within(dialog).getByText(/ratangga/i)).toBeInTheDocument();
    expect(posted).toHaveLength(0);
  });

  it("posts exactly once after confirmation", async () => {
    render(<AdminAlertsPage />);
    fireEvent.change(screen.getByLabelText(/alert title/i), {
      target: { value: "Test blockage" },
    });
    fireEvent.change(screen.getByLabelText(/impact & occ/i), {
      target: { value: "Flooding at the depot entrance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /broadcast alert to public/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm broadcast/i }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(JSON.parse((posted[0].body as string) as string).title).toBe("Test blockage");
  });
});

describe("Gate result persistence", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    seedStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps DENIED on screen past the old auto-clear window until dismissed", () => {
    render(<ScannerPage />);
    fireEvent.click(screen.getByText("Pass Expired"));
    fireEvent.click(screen.getByRole("button", { name: /validate dynamic qr pass/i }));
    expect(screen.getByText('ACCESS DENIED - INVALID TOKEN')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('ACCESS DENIED - INVALID TOKEN')).toBeInTheDocument();
    expect(screen.getByText(/logged to shift log/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText('ACCESS DENIED - INVALID TOKEN')).not.toBeInTheDocument();
  });
});
