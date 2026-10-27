/**
 * RED: feed cards are explicit — named "locate" action, visible affordance,
 * and tapping one hands off to the inspector (drawer collapses).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityLiveFeed } from "@/components/crowdsource/CommunityLiveFeed";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

const FEED_ITEM = {
  id: "r1",
  vehicleId: "veh-9",
  vehicleCode: "TS-01",
  lineCode: "SBD",
  lineColorHex: "#06b6d4",
  crowdLevel: "LEVEL_2_FEW_SEATS",
  acComfort: "OPTIMAL",
  note: "hello",
  timestampMs: Date.now(),
  userId: "other-user",
};

describe("crowd feed cards", () => {
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ feed: [FEED_ITEM] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the locate action and hands off on tap", async () => {
    const onLocate = vi.fn();
    render(
      <CommunityLiveFeed onOpenCheckIn={() => {}} onVehicleLocate={onLocate} />
    );
    const card = await screen.findByRole("button", {
      name: "TS-01 Track on Map",
    });
    expect(card).toBeInTheDocument();
    fireEvent.click(card);
    expect(useTransitStore.getState().selectedVehicleId).toBe("veh-9");
    expect(onLocate).toHaveBeenCalledTimes(1);
  });

  it("keyboard Enter activates the same handoff", async () => {
    const onLocate = vi.fn();
    render(
      <CommunityLiveFeed onOpenCheckIn={() => {}} onVehicleLocate={onLocate} />
    );
    const card = await screen.findByRole("button", {
      name: "TS-01 Track on Map",
    });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(useTransitStore.getState().selectedVehicleId).toBe("veh-9");
    expect(onLocate).toHaveBeenCalledTimes(1);
  });
});
