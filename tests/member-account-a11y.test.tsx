/**
 * RED: account panel meets its own design system — every interactive
 * control shows a visible focus ring, errors announce via role=alert,
 * inputs carry visible labels, and trip deletion asks first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

const MEMBER = { id: "m-a11y", displayName: "A11y", phone: "+6281555555555", email: null, role: "MEMBER", verifiedAt: null, createdAt: new Date().toISOString() };
const TRIP = { id: "trip-1", memberId: "m-a11y", origin: "Blok M", destination: "Bundaran HI", label: "Commute" };

describe("account panel a11y", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/api/members/me")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: MEMBER }) });
        }
        if (u.includes("/api/members/trips") && (!init || init.method === undefined || init.method === "GET")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [TRIP] }) });
        }
        if (u.includes("/api/members/tickets")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
        }
        if (u.includes("/api/members/claim")) {
          return Promise.resolve({ ok: false, status: 404, json: async () => ({ success: false, error: "TICKET_NOT_FOUND" }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openSignedIn(): Promise<HTMLElement> {
    const { container } = render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
    expect(await screen.findByText("Purchase history")).toBeInTheDocument();
    return container;
  }

  it("every interactive control shows a visible focus ring", async () => {
    const container = await openSignedIn();
    const controls = Array.from(
      container.querySelectorAll("button, input, a")
    ) as HTMLElement[];
    expect(controls.length).toBeGreaterThan(3);
    const withoutRing = controls.filter(
      (el) => !(el as HTMLElement).className.includes("focus-visible")
    );
    expect(withoutRing.map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  });

  it("announces failures through a live region", async () => {
    await openSignedIn();
    fireEvent.change(screen.getByLabelText("Reservation code"), { target: { value: "NOPE01" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+628100000001" } });
    fireEvent.click(screen.getByRole("button", { name: /^link ticket$/i }));
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no ticket matches/i);
  });

  it("labels inputs visibly, not only for assistive tech", async () => {
    const container = await openSignedIn();
    const codeInput = screen.getByLabelText("Reservation code");
    const visibleLabels = Array.from(container.querySelectorAll("label"));
    expect(visibleLabels.length).toBeGreaterThan(0);
    expect(visibleLabels.map((l) => l.textContent)).toContain("Reservation code");
    expect((codeInput as HTMLInputElement).getAttribute("aria-label")).toBeNull();
  });

  it("asks before deleting a saved trip", async () => {
    const deleted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/members/trips/") && init?.method === "DELETE") {
          deleted.push(u);
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
        }
        if (u.includes("/api/members/me")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: MEMBER }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [TRIP] }) });
      })
    );
    await openSignedIn();
    const deleteBtn = await screen.findByRole("button", { name: /delete trip/i });
    fireEvent.click(deleteBtn);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(deleted).toEqual([]);
    expect(screen.getByText("Commute")).toBeInTheDocument();
    const confirmBtn = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(deleted.length).toBe(1);
    expect(screen.queryByText("Commute")).toBeNull();
  });
});
