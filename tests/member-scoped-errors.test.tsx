/**
 * RED: link-form failures surface next to the link form — not at the panel
 * bottom — and move focus to the message so its context is announced.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

const MEMBER = { id: "m-link", displayName: "Linker", phone: "+6281111111111", email: null, role: "MEMBER", verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

describe("scoped link errors", () => {
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
        if (u.includes("/api/members/claim")) {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ success: false, error: "ALREADY_CLAIMED" }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the link error beside the link button and moves focus to it", async () => {
    const { container } = render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
    await screen.findByText("Purchase history");
    fireEvent.change(screen.getByLabelText("Reservation code"), { target: { value: "LNK007" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+6281111111111" } });
    fireEvent.click(screen.getByRole("button", { name: /^link ticket$/i }));
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(/already linked/i);
    const alert = alerts[0];
    const linkButton = screen.getByRole("button", { name: /^link ticket$/i });
    expect(alert.compareDocumentPosition(linkButton) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(document.activeElement).toBe(alert);
    expect(container.querySelectorAll('[role="alert"]').length).toBe(1);
  });
});
