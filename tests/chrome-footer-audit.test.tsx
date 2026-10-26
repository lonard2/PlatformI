/**
 * RED: footer a11y audit — every tab exposes a visible focus ring and
 * inactive labels meet the raised contrast floor.
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
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderNav(): void {
  render(<MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} onOpenJourney={() => {}} />);
}

describe("footer a11y audit", () => {
  it("gives every primary tab a visible focus ring", async () => {
    renderNav();
    for (const name of [/^map$/i, /^route$/i, /^status$/i, /^tickets$/i, /^more$/i]) {
      const tab = await screen.findByRole("button", { name });
      expect(tab.className).toMatch(/focus-visible:ring-2/);
    }
  });

  it("renders inactive tabs above the slate-400 floor", async () => {
    renderNav();
    const tickets = await screen.findByRole("button", { name: /^tickets$/i });
    expect(tickets.className).not.toMatch(/text-slate-400/);
    expect(tickets.className).toMatch(/text-slate-300/);
  });
});
