/**
 * RED: a running ceremony can be cancelled — Cancel button with run-id
 * invalidation + fetch abort, live countdown in the status line, and
 * stale completions ignored after cancel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

let resolveRegistration: ((v: unknown) => void) | null = null;

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(
    () =>
      new Promise((resolve) => {
        (globalThis as unknown as { __resolveReg: (v: unknown) => void }).__resolveReg = resolve as (
          v: unknown
        ) => void;
        resolveRegistration = resolve as (v: unknown) => void;
      })
  ),
  startAuthentication: vi.fn(() => new Promise(() => {})),
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
          json: async () => ({ success: true, data: { provisionalId: "p", options: { challenge: "c" } } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
    })
  );
}

describe("ceremony cancel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    stubFetch();
    resolveRegistration = null;
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

  it("shows a cancel button during a ceremony and the countdown ticks", async () => {
    await openPanel();
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    const cancel = screen.getByRole("button", { name: /^cancel$/i });
    expect(cancel).toBeInTheDocument();
    expect(screen.getByText(/\(\d+s left\)/i)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/\(6\d+s left\)|\(70s left\)/i)).toBeInTheDocument();
  });

  it("cancelling releases the UI and ignores the late completion", async () => {
    await openPanel();
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Uji" } });
    fireEvent.click(screen.getByRole("button", { name: /register with passkey/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register with passkey/i })).not.toBeDisabled();
    const resolve = (globalThis as unknown as { __resolveReg?: (v: unknown) => void }).__resolveReg;
    expect(resolve).toBeDefined();
    await act(async () => {
      resolve!({ id: "cred-1", rawId: "cred-1" });
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(screen.queryByText(/waiting for your device/i)).toBeNull();
    expect(screen.getByRole("button", { name: /register with passkey/i })).not.toBeDisabled();
  });
});
