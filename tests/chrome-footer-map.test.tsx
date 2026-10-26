/**
 * RED: footer map/reset discipline — Map preserves context on the way home
 * and only resets when already home; Journey without a handler is inert.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    activeAlerts: [],
    activeDrawer: null,
    selectedStopId: null,
    selectedVehicleId: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("footer map discipline", () => {
  it("closes the drawer but preserves selection on the way home", async () => {
    useTransitStore.setState({ activeDrawer: "tickets", selectedStopId: "stop-mrt-01" });
    render(<MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} onOpenJourney={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /^map$/i }));
    expect(useTransitStore.getState().activeDrawer).toBeNull();
    expect(useTransitStore.getState().selectedStopId).toBe("stop-mrt-01");
  });

  it("clears selection when already home", async () => {
    useTransitStore.setState({ activeDrawer: null, selectedStopId: "stop-mrt-01" });
    render(<MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} onOpenJourney={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /^map$/i }));
    expect(useTransitStore.getState().selectedStopId).toBeNull();
  });

  it("marks Journey inert without a handler", async () => {
    render(<MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} />);
    const journey = await screen.findByRole("button", { name: /^route$/i });
    expect(journey).toHaveAttribute("aria-disabled", "true");
  });
});
