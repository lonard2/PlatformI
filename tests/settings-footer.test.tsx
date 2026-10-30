/**
 * RED: the settings footer is honest — a single Done button (everything
 * applies live, there is nothing to save and nothing to cancel).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppSettingsModal } from "@/components/settings/AppSettingsModal";
import { useLanguageStore } from "@/lib/i18n";
import { useTransitStore } from "@/lib/stores/useTransitStore";

describe("settings footer honesty", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers Done instead of draft semantics", async () => {
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
    const onClose = vi.fn();
    render(<AppSettingsModal isOpen onClose={onClose} />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^cancel$/i })).toBeNull();
    const done = await screen.findByRole("button", { name: "Done" });
    fireEvent.click(done);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
