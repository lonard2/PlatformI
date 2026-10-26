/** RED: ACTIVE tab is scannable-only; waiting/failed sit behind a pending disclosure. */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
});

describe("active tab focus", () => {
  it("collapses waiting and failed passes into a pending disclosure", () => {
    const { container } = render(<DigitalPassWallet />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details?.textContent ?? "").toMatch(/pending/i);
    // Scannable pass stays visible outside the disclosure.
    expect(screen.getByText(/ready to tap/i)).toBeInTheDocument();
  });

  it("reveals waiting passes with a pay action on expand", () => {
    const { container } = render(<DigitalPassWallet />);
    const details = container.querySelector("details") as HTMLElement;
    fireEvent.click(screen.getByText(/pending/i));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText(/waiting for payment/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /pay now/i }).length).toBeGreaterThan(0);
  });
});
