/**
 * RED: footer open states — Journey reads open like every other tab,
 * AI resting state stops impersonating an active tab.
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

function renderNav(props: Partial<React.ComponentProps<typeof MobileBottomNav>> = {}): void {
  render(
    <MobileBottomNav onOpenAI={() => {}} onOpenStatus={() => {}} onOpenJourney={() => {}} {...props} />
  );
}

describe("footer open states", () => {
  it("styles an open Journey tab like every other open tab", async () => {
    renderNav({ isJourneyOpen: true });
    const journey = await screen.findByRole("button", { name: /^route$/i });
    expect(journey.className).toMatch(/text-cyan-400/);
    expect(journey).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves a closed Journey tab neutral", async () => {
    renderNav({ isJourneyOpen: false });
    const journey = await screen.findByRole("button", { name: /^route$/i });
    expect(journey.className).not.toMatch(/text-cyan-400/);
  });

  it("stops the AI tab glowing and pulsing at rest", async () => {
    renderNav({ isAIOpen: false });
    fireEvent.click(await screen.findByRole("button", { name: /^more$/i }));
    const ai = await screen.findByRole("button", { name: /ai travel assistant/i });
    expect(within(ai as HTMLElement).getByText("AI").className).not.toMatch(/text-cyan-300/);
    expect(ai.querySelector('[class*="animate-pulse"]')).not.toBeInTheDocument();
  });

  it("keeps the AI tab highlighted while open", async () => {
    renderNav({ isAIOpen: true });
    fireEvent.click(await screen.findByRole("button", { name: /^more$/i }));
    const ai = await screen.findByRole("button", { name: /ai travel assistant/i });
    expect(ai.className).toMatch(/text-cyan-400/);
  });
});
