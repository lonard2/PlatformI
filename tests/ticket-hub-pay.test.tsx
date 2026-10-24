
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntercityTicketHub, resolveIntercityFareParts } from "@/components/ticketing/IntercityTicketHub";
import { useLanguageStore } from "@/lib/i18n";
import type { TimetableRun } from "@/types/transit";

const KAI_RUN_PAY: TimetableRun = {
  id: "run-kai-01",
  lineId: "line-kai-intercity",
  tripCode: "KA-01",
  origin: "Stasiun Gambir (GMR)",
  destination: "Surabaya Pasarturi (SBI)",
  departureTime: "08:20",
  arrivalTime: "16:30",
  operatorName: "PT Kereta Api Indonesia (Persero)",
  serviceClass: "Eksekutif New Generation & Luxury Sleeper",
} as TimetableRun;

function mockPayFlow(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          String(url).includes("/api/ticketing/purchase")
            ? {
                ticketNumber: "TKT-PAY-01",
                reservationCode: "RSV-PAY-01",
                status: "ACTIVE",
              }
            : { runs: [] },
      })
    )
  );
}

describe("IntercityTicketHub pay reassurance", () => {
  it("splits the fare into base, multiplier, and rounded total", () => {
    expect(resolveIntercityFareParts("KAI_INTERCITY", "Business")).toEqual({
      base: 150000,
      multiplier: 1.4,
      total: 210000,
    });
  });
  beforeEach(() => {
    useLanguageStore.getState().setLanguage("en");
    mockPayFlow();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function reachPayStep(): Promise<void> {
    render(
      <IntercityTicketHub
        preselectedRun={KAI_RUN_PAY}
        initialMode="KAI_INTERCITY"
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

  it("offers a payment method choice with fare math before paying", async () => {
    await reachPayStep();
    expect(screen.getByText(/select payment method/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /qris/i })).toBeInTheDocument();
    expect(screen.getByText(/base fare/i)).toBeInTheDocument();
    expect(screen.getByText(/class x/i)).toBeInTheDocument();
  });

  it("shows the reservation code and chosen method after a successful pay", async () => {
    await reachPayStep();
    fireEvent.click(screen.getByRole("radio", { name: /qris/i }));
    fireEvent.click(screen.getByRole("button", { name: /pay now/i }));
    expect(await screen.findByText(/RSV-PAY-01/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /qris/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});
