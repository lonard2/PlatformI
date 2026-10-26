/**
 * RED: footer overflow — 4 primaries plus a More sheet for the
 * secondary entries, with full labels.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useLanguageStore } from "@/lib/i18n";

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

function renderNav(onOpenAI: () => void = () => {}): void {
  render(<MobileBottomNav onOpenAI={onOpenAI} onOpenStatus={() => {}} onOpenJourney={() => {}} />);
}

describe("footer overflow", () => {
  it("shows four primaries plus a More entry", async () => {
    renderNav();
    for (const name of [/^map$/i, /^route$/i, /^status$/i, /^tickets$/i]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
    expect(await screen.findByRole("button", { name: /^more$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ai travel assistant/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Crowd")).not.toBeInTheDocument();
  });

  it("opens Community and AI from the overflow sheet", async () => {
    const onOpenAI = vi.fn();
    renderNav(onOpenAI);
    fireEvent.click(await screen.findByRole("button", { name: /^more$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ai travel assistant/i }));
    expect(onOpenAI).toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /^more$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^crowd$/i }));
    expect(useTransitStore.getState().activeDrawer).toBe("crowdsource");
  });

  it("uses 12px labels on primary tabs", async () => {
    renderNav();
    const map = await screen.findByRole("button", { name: /^map$/i });
    expect(within(map).getByText("Map").className).toMatch(/text-xs/);
  });
});
