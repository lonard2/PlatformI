/**
 * RED: the panel links guest tickets to the account — code + phone form
 * with TICKET_NOT_FOUND / ALREADY_CLAIMED guidance, enriched history rows,
 * and a count with view-all.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";
import { useLanguageStore } from "@/lib/i18n";

const MEMBER = { id: "m-link", displayName: "Linker", phone: "+6281111111111", email: null, role: "MEMBER", verifiedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

function ticket(i: number) {
  return {
    id: `t-link-${i}`,
    ticketNumber: `TKT-LINK-${i}`,
    reservationCode: `LNK00${i}`,
    status: "CONFIRMED",
    originStopId: `Stop A${i}`,
    destinationStopId: `Stop B${i}`,
  };
}

describe("link a ticket", () => {
  let claimHandler: (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

  beforeEach(() => {
    window.localStorage.clear();
    useLanguageStore.setState({ language: "en" });
    claimHandler = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: null }) });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/api/members/me")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: MEMBER }) });
        }
        if (u.includes("/trips")) {
          return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
        }
        if (u.includes("/api/members/claim")) return claimHandler(u, init as RequestInit);
        if (u.includes("/api/members/tickets")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [ticket(1), ticket(2), ticket(3), ticket(4), ticket(5), ticket(6)] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: null }) });
      })
    );
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

  async function flush(rounds = 10): Promise<void> {
    await act(async () => {
      for (let i = 0; i < rounds; i++) await Promise.resolve();
    });
  }

  it("links a ticket with code + phone and clears the form", async () => {
    await openPanel();
    const codeInput = screen.getByLabelText("Reservation code") as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: "LNK007" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+6281111111111" } });
    fireEvent.click(screen.getByRole("button", { name: /^link ticket$/i }));
    await flush(20);
    expect(codeInput.value).toBe("");
    expect(screen.queryByText(/no ticket matches|already linked/i)).toBeNull();
  });

  it("explains an unknown code without leaking", async () => {
    claimHandler = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: "TICKET_NOT_FOUND" }),
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText("Reservation code"), { target: { value: "NOPE01" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+628100000000" } });
    fireEvent.click(screen.getByRole("button", { name: /^link ticket$/i }));
    await flush(20);
    expect(screen.getByText(/no ticket matches/i)).toBeInTheDocument();
  });

  it("explains an already-claimed ticket", async () => {
    claimHandler = async () => ({
      ok: false,
      status: 409,
      json: async () => ({ success: false, error: "ALREADY_CLAIMED" }),
    });
    await openPanel();
    fireEvent.change(screen.getByLabelText("Reservation code"), { target: { value: "LNK001" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+628100000001" } });
    fireEvent.click(screen.getByRole("button", { name: /^link ticket$/i }));
    await flush(20);
    expect(screen.getByText(/already linked/i)).toBeInTheDocument();
  });

  it("shows enriched rows with a count and view-all", async () => {
    await openPanel();
    expect(screen.getByText(/6 tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop A1/)).toBeInTheDocument();
    expect(screen.queryByText(/Stop A6/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByText(/Stop A6/)).toBeInTheDocument();
  });
});
