/**
 * RED/verify: no-vehicle submit must surface the inline error (role=alert)
 * without POSTing, and the error must clear once a vehicle is chosen.
 * (Live session showed a silent submit; this pins the contract either way.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInModal } from "@/components/crowdsource/CheckInModal";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

describe("crowd submit validation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    useTransitStore.setState({
      allLines: [],
      allStops: [],
      simulatedVehicles: [],
      activeAlerts: [],
      alertsSyncedAt: null,
      selectedVehicleId: null,
      selectedStopId: null,
      activeDrawer: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubCheckin(ok: boolean) {
    const post = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok,
        json: async () => ({}),
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/crowdsource/checkin")) return post(url, init);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);
      })
    );
    return post;
  }

  it("empty submit shows the error and never POSTs", async () => {
    const post = stubCheckin(true);
    render(
      <CheckInModal
        isOpen
        onClose={() => {}}
        initialVehicleId={null}
        initialLineId={null}
      />
    );
    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Vehicle Check-In" })
    );
    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(/select an active transit vehicle/i);
    expect(post).not.toHaveBeenCalled();
  });

  it("error clears once a vehicle is chosen in the dropdown", async () => {
    stubCheckin(true);
    useTransitStore.setState({
      simulatedVehicles: [
        {
          id: "veh-1",
          vehicleCode: "TS-01",
          name: "Test Bus",
          lineId: "line-tj-brt-1",
        } as never,
      ],
    });
    render(
      <CheckInModal
        isOpen
        onClose={() => {}}
        initialVehicleId={null}
        initialLineId={null}
      />
    );
    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Vehicle Check-In" })
    );
    await screen.findByRole("alert");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Target Transit Vehicle" }),
      {
        target: { value: "veh-1" },
      }
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("valid submit POSTs the check-in and shows success", async () => {
    const post = stubCheckin(true);
    render(
      <CheckInModal
        isOpen
        onClose={() => {}}
        initialVehicleId="veh-1"
        initialLineId={null}
      />
    );
    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Vehicle Check-In" })
    );
    expect(
      await screen.findByText("Report Broadcasted Successfully")
    ).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    const sentInit = post.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(sentInit.body)) as { vehicleId?: string };
    expect(body).toMatchObject({ vehicleId: "veh-1" });
  });
});
