/**
 * RED: Esc dismisses the check-in modal even when focus is outside the
 * panel's React bubble path (document-level listener, focus trap kept).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInModal } from "@/components/crowdsource/CheckInModal";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

describe("crowd modal esc", () => {
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

  it("closes on Escape with focus outside the panel", async () => {
    const onClose = vi.fn();
    render(
      <CheckInModal
        isOpen
        onClose={onClose}
        initialVehicleId={null}
        initialLineId={null}
      />
    );
    await screen.findByRole("dialog");
    (document.body as HTMLElement).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape with focus on the dialog itself", async () => {
    const onClose = vi.fn();
    render(
      <CheckInModal
        isOpen
        onClose={onClose}
        initialVehicleId={null}
        initialLineId={null}
      />
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
