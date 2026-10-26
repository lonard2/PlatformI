/** RED: gate result wraps with live region, passenger verbs, QR-derived tap rules. */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
});

afterEach(() => {
  // none
});

describe("gate result clarity", () => {
  it("announces the tap result in a wrapping live region", async () => {
    const fetchMock = async () => ({
      ok: true,
      json: async () => ({ isValid: true }),
    });
    (globalThis as Record<string, unknown>).fetch = fetchMock as unknown as typeof fetch;
    try {
      render(<DigitalPassWallet />);
      fireEvent.click(screen.getByRole("button", { name: /^tap in$/i }));
      const status = await screen.findByRole("status");
      expect(status.textContent ?? "").toMatch(/tap-in verified/i);
      expect(status.className).not.toMatch(/truncate/);
      expect(status.textContent ?? "").not.toBe("");
      const inner = status.querySelector("span");
      expect(inner?.className ?? "").not.toMatch(/truncate/);
    } finally {
      delete (globalThis as Record<string, unknown>).fetch;
    }
  });

  it("uses passenger verbs without simulator wording", () => {
    render(<DigitalPassWallet />);
    expect(screen.getByText(/^gate scanner$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tap in$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tap out$/i })).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/simulate/i);
  });

  it("disables tap-out before tap-in with a stated reason", () => {
    render(<DigitalPassWallet />);
    const tapOut = screen.getByRole("button", { name: /^tap out/i });
    expect(tapOut).toBeDisabled();
    expect(document.body.textContent ?? "").toMatch(/tap in first|tap-in first/i);
  });
});
