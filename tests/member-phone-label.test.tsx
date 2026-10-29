/**
 * RED: the phone field tells the truth — optional for registration,
 * required to sign in — instead of a bare "optional" that strands
 * first-timers at a disabled Continue button.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

describe("phone label honesty", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says the field is optional to register but required to sign in", async () => {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.getByLabelText(/required to sign in/i)).toBeInTheDocument();
  });
});
