/**
 * RED: corridors surface end-to-end — a v3 run found via hub search shows
 * its representative fare on the card, and reserving it posts that fare.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntercityTicketHub } from "@/components/ticketing/IntercityTicketHub";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const KA202 = {
  id: "run-ka-202",
  lineId: "line-kai-intercity",
  tripCode: "KA-202",
  origin: "Stasiun Gambir (GMR)",
  destination: "Stasiun Yogyakarta (YK)",
  departureTime: "08:00",
  arrivalTime: "15:20",
  operatorName: "PT Kereta Api Indonesia (Persero)",
  operatorId: "op-kai",
  serviceClass: "Eksekutif Taksaka",
  gateOrBay: "Jalur 3 (Peron 2)",
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  fareRp: 500000,
} as TimetableRun;

describe("hub corridor end-to-end", () => {
  let purchaseBodies: Array<Record<string, unknown>>;

  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    purchaseBodies = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).includes("/api/intercity/routes")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ runs: [KA202] }),
          });
        }
        if (String(url).includes("/api/ticketing/purchase")) {
          purchaseBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ticketNumber: "TKT-CORR-01",
              reservationCode: "RSV-CORR-01",
              status: "WAITING",
              paymentRef: "MAN-RSV-CORR-01-x",
              paymentInstructions: "Transfer Rp500.000 quote RSV-CORR-01",
            }),
          });
        }
        if (String(url).includes("/api/ticketing/guest-lookup")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              ticket: { ticketNumber: "TKT-CORR-01", reservationCode: "RSV-CORR-01", status: "WAITING" },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ runs: [] }) });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the run fare on the card and posts it at reserve", async () => {
    render(<IntercityTicketHub initialMode="KAI_INTERCITY" statusPollIntervalMs={200} />);
    fireEvent.click(screen.getByRole("button", { name: /search trips/i }));
    // Card shows the run's representative fare, not the mode-base estimate.
    expect(await screen.findByText(/Rp\s?500\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /select ka-202/i }));
    fireEvent.click(await screen.findByLabelText(/1B/));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(await screen.findByLabelText(/full name/i), { target: { value: "Siti Rahayu" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "081234567890" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "siti@example.com" } });
    fireEvent.change(screen.getByLabelText(/id number/i), { target: { value: "3174050101900001" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    await screen.findByText("4. Wallet");
    fireEvent.click(screen.getByRole("button", { name: /reserve seat/i }));
    await screen.findByText(/wait for occ confirmation/i);
    expect(purchaseBodies).toHaveLength(1);
    expect(purchaseBodies[0]["totalFareRp"]).toBe(500000);
    expect(purchaseBodies[0]["tripCode"]).toBe("KA-202");
  });
});
