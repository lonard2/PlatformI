/**
 * RED: the running ceremony is visible on the button itself — "Waiting…"
 * plus a spinner — while the other ceremony button is visibly disabled,
 * so nothing looks clickable-but-dead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(() => new Promise(() => {})),
  startAuthentication: vi.fn(() => new Promise(() => {})),
}));

function stubMe(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/members/me")) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (String(url).includes("/login/begin") || String(url).includes("/register/begin")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { provisionalId: "p", memberId: "m", options: { challenge: "c" } } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
    })
  );
}

describe("busy visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    stubMe();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function openPanel(): Promise<void> {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
  }

  it("register shows waiting state and login is visibly disabled", async () => {
    await openPanel();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji" } });
    fireEvent.change(screen.getByLabelText(/^phone/i), { target: { value: "+628100000001" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const registerBtn = screen.getByRole("button", { name: /waiting|register with passkey/i });
    expect(within(registerBtn).getByText(/waiting/i)).toBeInTheDocument();
    expect(registerBtn.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.getByRole("button", { name: /continue with passkey/i })).toBeDisabled();
  });

  it("login shows waiting state and register is visibly disabled", async () => {
    await openPanel();
    fireEvent.change(screen.getByLabelText(/^phone/i), { target: { value: "+628100000002" } });
    fireEvent.click(screen.getByRole("button", { name: /continue with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const loginBtn = screen.getByRole("button", { name: /waiting|continue with passkey/i });
    expect(within(loginBtn).getByText(/waiting/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register with passkey/i })).toBeDisabled();
  });
});
