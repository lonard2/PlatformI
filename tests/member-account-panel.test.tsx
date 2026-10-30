/**
 * RED: account panel never freezes — ceremony busy state is per-action,
 * an aria-live status line narrates the wait, and a client timeout resets
 * a stuck ceremony with exact next steps.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(() => new Promise(() => {})),
  startAuthentication: vi.fn(async () => ({ id: "cred-1", rawId: "cred-1" })),
}));

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/members/me")) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (String(url).includes("/register/begin")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { provisionalId: "prov-1", options: { challenge: "c" } },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
    })
  );
}

describe("account panel ceremony states", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("freezes the whole ceremony surface with the running action named", async () => {
    vi.useFakeTimers();
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const nameInput = screen.getByLabelText("Display name");
    fireEvent.change(nameInput, { target: { value: "Uji" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081234567890" } });
    const registerBtn = screen.getByRole("button", { name: /register with passkey/i });
    fireEvent.click(registerBtn);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    // The other ceremony button is visibly disabled — no clickable-but-dead controls.
    expect(screen.getByRole("button", { name: /continue with passkey/i })).toBeDisabled();
    expect(screen.getByText(/waiting for your device/i)).toBeInTheDocument();
  });

  it("a stuck ceremony times out with next steps and releases the UI", async () => {
    vi.useFakeTimers();
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji" } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "081234567890" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(76_000);
    });
    expect(screen.getByText(/timed out/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register with passkey/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /continue with passkey/i })).not.toBeDisabled();
  });
});
