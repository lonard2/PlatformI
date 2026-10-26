/** RED: wallet polish — tab semantics, touch targets, single prefix, trip dates. */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
});

describe("wallet polish", () => {
  it("exposes the wallet tabs with tab semantics and selection", () => {
    render(<DigitalPassWallet />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("gives tab targets a 44px minimum height", () => {
    render(<DigitalPassWallet />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toMatch(/min-h-\[44px\]/);
    }
  });

  it("shows the ticket number once without a doubled prefix", () => {
    const { container } = render(<DigitalPassWallet />);
    expect(container.textContent ?? "").not.toMatch(/Ticket #TKT-/);
    expect(screen.getAllByText("TKT-MRT-88219").length).toBeGreaterThan(0);
  });

  it("shows a trip date on history rows", () => {
    render(<DigitalPassWallet />);
    fireEvent.click(screen.getByRole("tab", { name: /trip history/i }));
    expect(document.body.textContent ?? "").toMatch(/20\d\d/);
  });
});
