/**
 * RED: small print that orients — where to find a reservation code,
 * singular count, an empty history that points at the link form,
 * and a spoken confirmation on logout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

const MEMBER = { id: "m-help", displayName: "Bantu", phone: "+628199000001", email: null, role: "MEMBER", verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

function ticket(i: number) {
  return {
    id: `t-help-${i}`,
    ticketNumber: `TKT-H${i}`,
    reservationCode: `HLP00${i}`,
    status: "CONFIRMED",
    originStopId: `Stop A${i}`,
    destinationStopId: `Stop B${i}`,
  };
}

describe("link help and minors", () => {
  let tickets: Array<ReturnType<typeof ticket>> = [];

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
        if (u.includes("/api/members/trips")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
        }
        if (u.includes("/api/members/tickets")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: tickets }) });
        }
        if (u.includes("/api/members/claim")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { id: "t-new" } }) });
        }
        if (u.includes("/api/members/logout")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openSignedIn(): Promise<void> {
    render(<MemberAccountPanel />);
    await act(async () => {
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
    await screen.findByText("Purchase history");
  }

  it("tells users where a reservation code lives", async () => {
    tickets = [ticket(1)];
    await openSignedIn();
    expect(screen.getByText(/guest purchase receipt|confirmation email/i)).toBeInTheDocument();
  });

  it("singularizes a single ticket", async () => {
    tickets = [ticket(1)];
    await openSignedIn();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(screen.queryByText("1 tickets")).toBeNull();
  });

  it("points an empty history at the link form", async () => {
    tickets = [];
    await openSignedIn();
    expect(screen.getByText(/link a ticket above/i)).toBeInTheDocument();
  });

  it("confirms logout out loud", async () => {
    tickets = [];
    await openSignedIn();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(await screen.findByText(/signed out/i)).toBeInTheDocument();
  });
});
