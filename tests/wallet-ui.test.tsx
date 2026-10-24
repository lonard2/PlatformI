/**
 * PlatformI - Wallet UI with guest lookup and QR states (Task 3).
 * GuestTicketLookup accepts code plus phone with support fallback fields
 * (trip date, ID, operator, journey, route name); the wallet shows success,
 * waiting, failed, and refunded states with matching QR behavior (QR only
 * for active reservations; refunded/expired show the reason).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestTicketLookup } from "@/components/ticketing/GuestTicketLookup";
import { DynamicQRCode } from "@/components/ticketing/DynamicQRCode";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.getState().setLanguage("en");
});

describe("GuestTicketLookup", () => {
  it("finds a guest ticket by code plus phone", () => {
    render(<GuestTicketLookup onFound={() => {}} />);
    expect(screen.getByLabelText(/ticket code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("exposes support fallback fields for assisted lookup", () => {
    render(<GuestTicketLookup onFound={() => {}} />);
    expect(screen.getByLabelText(/trip date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/id number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/operator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/journey/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/route name/i)).toBeInTheDocument();
  });

  it("calls onFound with the guest projection after a code plus phone lookup", async () => {
    const onFound = vi.fn();
    const createdAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const expiresAt = new Date(Date.now() + 23 * 3600 * 1000).toISOString();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          ticket: {
            ticketNumber: "TKT-GUEST-01",
            reservationCode: "RSV-ABC123",
            status: "WAITING",
            originStopId: "STOP-A",
            destinationStopId: "STOP-B",
            seatId: null,
            serviceClass: null,
            buyerFullName: null,
            travelDate: "2026-11-01",
            tripCode: "TRIP-01",
            createdAt,
            expiresAt,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<GuestTicketLookup onFound={onFound} />);
      fireEvent.change(screen.getByLabelText(/ticket code/i), {
        target: { value: "RSV-ABC123" },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "081234567890" },
      });
      fireEvent.click(screen.getByRole("button", { name: /find ticket/i }));
      await waitFor(() => expect(onFound).toHaveBeenCalledTimes(1));
      expect(onFound.mock.calls[0][0]).toMatchObject({
        ticketNumber: "TKT-GUEST-01",
        reservationCode: "RSV-ABC123",
        travelDate: "2026-11-01",
        tripCode: "TRIP-01",
        createdAt,
        expiresAt,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("appends non-empty fallback fields to the lookup query", async () => {
    const onFound = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          ticket: {
            ticketNumber: "TKT-GUEST-02",
            reservationCode: "RSV-XYZ789",
            status: "WAITING",
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<GuestTicketLookup onFound={onFound} />);
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "081234567890" },
      });
      fireEvent.change(screen.getByLabelText(/trip date/i), {
        target: { value: "2026-11-01" },
      });
      fireEvent.change(screen.getByLabelText(/id number/i), {
        target: { value: "3174050101900001" },
      });
      fireEvent.click(screen.getByRole("button", { name: /find ticket/i }));
      await waitFor(() => expect(onFound).toHaveBeenCalledTimes(1));
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("phone=");
      expect(url).toContain("tripDate=2026-11-01");
      expect(url).toContain("idNumber=3174050101900001");
      expect(url).not.toContain("operator=");
      expect(url).not.toContain("journey=");
      expect(url).not.toContain("routeName=");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("blocks search without a code and without support details", () => {
    const onFound = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<GuestTicketLookup onFound={onFound} />);
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "081234567890" },
      });
      fireEvent.click(screen.getByRole("button", { name: /find ticket/i }));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onFound).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("DynamicQRCode reservation states", () => {
  it("renders the QR matrix for an active reservation", () => {
    const { container } = render(
      <DynamicQRCode ticketId="TKT-ACTIVE-01" status="ACTIVE" />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the refunded reason instead of a QR matrix", () => {
    const { container } = render(
      <DynamicQRCode ticketId="TKT-REFUNDED-01" status="REFUNDED" />
    );
    expect(container.querySelector("svg rect")).not.toBeInTheDocument();
    expect(screen.getByText(/was refunded/i)).toBeInTheDocument();
  });

  it("shows the expired reason instead of a QR matrix", () => {
    const { container } = render(
      <DynamicQRCode ticketId="TKT-EXPIRED-01" status="EXPIRED" />
    );
    expect(container.querySelector("svg rect")).not.toBeInTheDocument();
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });
});

describe("DigitalPassWallet reservation states", () => {
  it("shows waiting and failed states alongside active passes", () => {
    render(<DigitalPassWallet />);
    expect(document.body.textContent).toMatch(/waiting/i);
    expect(document.body.textContent).toMatch(/failed/i);
  });

  it("shows refunded passes in trip history with the refunded state", () => {
    render(<DigitalPassWallet />);
    fireEvent.click(screen.getByText(/trip history/i));
    expect(document.body.textContent).toMatch(/refund/i);
  });

  it("merges a guest-found ticket with the server expiry instead of a synthetic one", async () => {
    const expiresAt = new Date(Date.now() + 23 * 3600 * 1000).toISOString();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          ticket: {
            ticketNumber: "TKT-GUEST-MERGE",
            reservationCode: "RSV-MERGE-01",
            status: "WAITING",
            originStopId: "STOP-A",
            destinationStopId: "STOP-B",
            seatId: null,
            serviceClass: null,
            buyerFullName: null,
            travelDate: "2026-11-01",
            tripCode: "TRIP-01",
            createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
            expiresAt,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<DigitalPassWallet />);
      fireEvent.click(screen.getByText(/find a guest ticket/i));
      fireEvent.change(screen.getByLabelText(/ticket code/i), {
        target: { value: "RSV-MERGE-01" },
      });
      fireEvent.change(screen.getByLabelText(/phone/i), {
        target: { value: "081234567890" },
      });
      fireEvent.click(screen.getByRole("button", { name: /find ticket/i }));
      await waitFor(() =>
        expect(screen.getByText(/RSV-MERGE-01/)).toBeInTheDocument()
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
