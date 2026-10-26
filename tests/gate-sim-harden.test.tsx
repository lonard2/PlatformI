/** RED: offline gate tap must deny honestly, preserve status, offer retry. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gate offline honesty", () => {
  it("reports DENY with no status mutation and offers a retry tap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    render(<DigitalPassWallet />);
    fireEvent.click(screen.getByRole("button", { name: /tap.in/i }));
    const deny = await screen.findByText(/no connection|offline|not sent/i);
    expect(deny).toBeInTheDocument();
    // QR must be preserved: ticket still scannable, not moved to IN_JOURNEY.
    expect(screen.getByText(/ready to tap/i)).toBeInTheDocument();
    const retry = await screen.findByRole("button", { name: /retry tap/i });
    expect(retry).toBeInTheDocument();
  });
});
