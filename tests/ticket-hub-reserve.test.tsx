/**
 * RED: hub reserve-then-pay — reserving shows transfer instructions with the
 * payment ref (never an instant pass), and the pass issues only after the
 * OCC confirm flips the reservation to ACTIVE.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntercityTicketHub } from "@/components/ticketing/IntercityTicketHub";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const KAI_RUN_RESERVE: TimetableRun = {
  id: "run-kai-02",
  lineId: "line-kai-intercity",
  tripCode: "KA-02",
  origin: "Stasiun Gambir (GMR)",
  destination: "Surabaya Pasarturi (SBI)",
  departureTime: "08:20",
  arrivalTime: "16:30",
  operatorName: "PT Kereta Api Indonesia (Persero)",
  serviceClass: "Eksekutif New Generation & Luxury Sleeper",
} as TimetableRun;

const INSTRUCTIONS =
  "Transfer Rp150.000 to the operator account and quote code RSV-RES-01 in the transfer note";

function mockReserveFlow(confirmOnLookup = 2): void {
  let lookups = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/ticketing/purchase")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ticketNumber: "TKT-RES-01",
            reservationCode: "RSV-RES-01",
            status: "WAITING",
            paymentRef: "MAN-RSV-RES-01-abc123",
            paymentInstructions: INSTRUCTIONS,
          }),
        });
      }
      if (String(url).includes("/api/ticketing/guest-lookup")) {
        lookups += 1;
        const status = lookups >= confirmOnLookup ? "ACTIVE" : "WAITING";
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            ticket: {
              ticketNumber: "TKT-RES-01",
              reservationCode: "RSV-RES-01",
              status,
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ runs: [] }) });
    })
  );
}

describe("IntercityTicketHub reserve-then-pay", () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    mockReserveFlow();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function reachWalletStep(): Promise<void> {
    render(
      <IntercityTicketHub
        preselectedRun={{ ...KAI_RUN_RESERVE, serviceClass: undefined } as TimetableRun}
        initialMode="KAI_INTERCITY"
        statusPollIntervalMs={200}
      />
    );
    fireEvent.click(await screen.findByLabelText(/1B/));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(await screen.findByLabelText(/full name/i), {
      target: { value: "Siti Rahayu" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "081234567890" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "siti@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3174050101900001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    await screen.findByText("4. Wallet");
  }

  it("shows transfer instructions with the payment ref instead of an instant pass", async () => {
    mockReserveFlow(Number.POSITIVE_INFINITY);
    await reachWalletStep();
    fireEvent.click(screen.getByRole("button", { name: /reserve seat/i }));
    expect(await screen.findByText(/wait for OCC confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/MAN-RSV-RES-01-abc123/)).toBeInTheDocument();
    expect(screen.getByText(/quote code RSV-RES-01/i)).toBeInTheDocument();
    expect(screen.queryByText(/intercity pass issued/i)).not.toBeInTheDocument();
  });

  it("issues the pass once the OCC confirm flips the reservation to ACTIVE", async () => {
    await reachWalletStep();
    fireEvent.click(screen.getByRole("button", { name: /reserve seat/i }));
    expect(await screen.findByText(/intercity pass issued/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/RSV-RES-01/)).toBeInTheDocument();
  });
});
