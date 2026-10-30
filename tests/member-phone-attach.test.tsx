/**
 * RED: phoneless accounts are not silent traps — registering without a
 * phone warns that only this device can sign back in, and signed-in
 * members without a phone get an attach form (server-persisted).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";
import { db } from "@/lib/db";

const NO_PHONE = {
  id: "m-nophone",
  displayName: "Tanpa HP",
  phone: null,
  email: null,
  role: "MEMBER",
  verifiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe("phoneless accounts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/api/members/me") && (!init || init.method === undefined || init.method === "GET")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: NO_PHONE }) });
        }
        if (u.includes("/api/members/me") && (init as RequestInit | undefined)?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { ...NO_PHONE, phone: "+6281999000001" } }),
          });
        }
        if (u.includes("/api/members/")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      })
    );
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

  it("warns at register time that no phone means this-device-only sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    );
    await openPanel();
    expect(screen.getByText(/only sign back in on this device/i)).toBeInTheDocument();
  });

  it("offers phone attach on a phoneless account and persists it", async () => {
    await openPanel();
    await screen.findByText("Purchase history");
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "+6281999000001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await act(async () => {
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
    expect(await screen.findByText("+6281999000001")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone number")).toBeNull();
  });
});
