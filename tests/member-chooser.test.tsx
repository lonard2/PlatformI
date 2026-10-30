/**
 * RED: the signed-out panel guides the choice — one line naming which
 * button is for newcomers vs returners, with Register as the primary
 * action and Continue-as demoted to a text link.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

function stubMe(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    })
  );
}

describe("account chooser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    stubMe();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openSignedOut(): Promise<void> {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
    await screen.findByText("Display name");
  }

  it("names which button is for newcomers vs returners", async () => {
    await openSignedOut();
    expect(screen.getByText(/new here\?/i)).toBeInTheDocument();
    expect(screen.getByText(/returning\?/i)).toBeInTheDocument();
  });

  it("ranks register primary, continue-as as a text link", async () => {
    window.localStorage.setItem(
      "platformi_last_member",
      JSON.stringify({ id: "m9", displayName: "Uji Lama" })
    );
    await openSignedOut();
    const register = screen.getByRole("button", { name: /register with passkey/i });
    const cont = screen.getByRole("button", { name: /continue as uji lama/i });
    expect(register.className).toMatch(/from-cyan-600|bg-gradient/);
    expect(cont.className).toMatch(/underline/);
    expect(cont.className).not.toMatch(/border/);
  });
});
