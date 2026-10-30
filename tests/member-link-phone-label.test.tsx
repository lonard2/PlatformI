/**
 * RED: the link form's phone field names its own meaning — the number must
 * match the guest purchase — instead of borrowing the registration label.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

const MEMBER = { id: "m-link", displayName: "Link", phone: "+628199900001", email: null, role: "MEMBER", verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

describe("link phone label", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const u = String(url);
        if (u.includes("/api/members/me")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: MEMBER }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("labels the link phone field with its own meaning", async () => {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    await screen.findByText("Purchase history");
    const input = screen.getByLabelText("Purchase phone number (must match)");
    expect(input.getAttribute("id")).toBe("member-link-phone");
  });
});
