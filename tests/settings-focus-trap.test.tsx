/**
 * RED: the settings dialog traps focus — autofocus lands inside on open,
 * Tab/Shift+Tab cycle within the dialog, Escape closes via the hook.
 * (The hook's containerRef was discarded, leaving all of this inert.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppSettingsModal } from "@/components/settings/AppSettingsModal";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

const FOCUSABLE =
  "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

describe("settings focus trap", () => {
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
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openDialog(onClose: () => void = () => {}): Promise<HTMLElement> {
    render(<AppSettingsModal isOpen onClose={onClose} />);
    const dialog = await screen.findByRole("dialog");
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    return dialog;
  }

  function focusables(dialog: HTMLElement): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  }

  it("moves focus inside the dialog on open", async () => {
    const dialog = await openDialog();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("cycles Tab from last back to first focusable", async () => {
    const dialog = await openDialog();
    const items = focusables(dialog);
    expect(items.length).toBeGreaterThan(1);
    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("cycles Shift+Tab from first to last focusable", async () => {
    const dialog = await openDialog();
    const items = focusables(dialog);
    expect(items.length).toBeGreaterThan(1);
    items[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("closes on Escape through the document listener", async () => {
    const onClose = vi.fn();
    await openDialog(onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
