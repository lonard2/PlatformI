/**
 * RED: OCC refund panel — staff look up a reservation (code + guest phone),
 * see refundability, confirm, and get the API verdict instead of curl.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminScannerPage from "@/app/admin/scanner/page";
import { useLanguageStore } from "@/lib/i18n";

const LOOKUP_TICKET = {
  ticketNumber: "TKT-REF-1",
  reservationCode: "RC-REF-1",
  status: "ACTIVE",
  originStopId: "stop-a",
  destinationStopId: "stop-b",
  seatId: "1A",
  serviceClass: "Eksekutif",
  buyerFullName: "Refund Buyer",
  guestEmail: null,
  guestPhone: "0812000111",
  travelDate: "2026-11-01",
  tripCode: "KA-01",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

function stubApi(refundImpl: (url: string, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("/api/ticketing/guest-lookup")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, ticket: LOOKUP_TICKET }),
        } as Response);
      }
      if (String(url).includes("/api/ticketing/refund")) {
        return refundImpl(url, init);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);
    })
  );
}

async function openRefundPanel(): Promise<HTMLElement> {
  render(<AdminScannerPage />);
  const panel = await screen.findByTestId("occ-refund-panel");
  fireEvent.change(within(panel).getByLabelText(/reservation code/i), {
    target: { value: "RC-REF-1" },
  });
  fireEvent.change(within(panel).getByLabelText(/guest phone/i), {
    target: { value: "0812000111" },
  });
  fireEvent.click(within(panel).getByRole("button", { name: /look up/i }));
  await within(panel).findByText("TKT-REF-1");
  return panel;
}

describe("occ refund panel", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("looks up then refunds a reservation", async () => {
    const posts: unknown[] = [];
    stubApi(async (_url, init) => {
      posts.push(JSON.parse(String(init?.body ?? "{}")));
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, ticketNumber: "TKT-REF-1", status: "REFUNDED" }),
      } as Response);
    });
    const panel = await openRefundPanel();
    fireEvent.click(within(panel).getByRole("button", { name: /confirm refund/i }));
    await within(panel).findByText(/refund completed/i);
    expect(posts).toEqual([{ ticketNumber: "TKT-REF-1" }]);
  });

  it("surfaces the gate-used rejection without mutating", async () => {
    stubApi(async () => {
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({
          error: "Ticket already used at the gate and cannot be refunded",
          reason: "GATE_SCAN_COMPLETED",
        }),
      } as unknown as Response);
    });
    const panel = await openRefundPanel();
    fireEvent.click(within(panel).getByRole("button", { name: /confirm refund/i }));
    await within(panel).findByText(/already used at the gate/i);
  });
});
