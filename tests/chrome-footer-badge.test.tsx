/**
 * RED: footer status badge — numbered severity badge with screen-reader
 * text instead of a color-only 8px dot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";
import type { DisruptionAlert } from "@/types/transit";

function alert(id: string): DisruptionAlert {
  return {
    id,
    lineId: "line-mrt-ns",
    title: `Disruption ${id}`,
    description: "Test disruption",
    severity: "WARNING",
    status: "ACTIVE",
    affectedStops: [],
    startTime: new Date().toISOString(),
  };
}

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
  useTransitStore.setState({
    activeAlerts: [],
    activeDrawer: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderNav(): void {
  render(<MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} />);
}

describe("footer status badge", () => {
  it("announces the alert count on the status tab", async () => {
    useTransitStore.setState({ activeAlerts: [alert("a1"), alert("a2"), alert("a3")] });
    renderNav();
    const statusBtn = await screen.findByRole("button", { name: /3 active/i });
    expect(within(statusBtn).getByText("3")).toBeInTheDocument();
    expect(statusBtn.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("caps double-digit counts at 9+", async () => {
    useTransitStore.setState({
      activeAlerts: Array.from({ length: 12 }, (_, i) => alert(`a${i}`)),
    });
    renderNav();
    const statusBtn = await screen.findByRole("button", { name: /9\+ active/i });
    expect(within(statusBtn).getByText("9+")).toBeInTheDocument();
  });

  it("shows no numbered badge when nothing is active", async () => {
    useTransitStore.setState({ activeAlerts: [] });
    renderNav();
    const statusBtn = await screen.findByRole("button", { name: /^status$/i });
    expect(within(statusBtn).queryByText(/^\d+\+?$/)).not.toBeInTheDocument();
  });
});
