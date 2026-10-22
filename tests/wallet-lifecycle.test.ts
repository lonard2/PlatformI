import { describe, it, expect } from "vitest";
import type { Ticket, TicketStatus } from "@/types/transit";

describe("wallet lifecycle model", () => {
  it("supports waiting, failed, refunded, and guest claim fields", () => {
    const lifecycleStatuses: TicketStatus[] = ["WAITING", "FAILED", "REFUNDED"];
    expect(lifecycleStatuses).toHaveLength(3);

    const ticket: Ticket = {
      id: "TKT-GUEST-01",
      ticketNumber: "TKT-GUEST-01",
      userId: "guest",
      originStopId: "STOP-A",
      destinationStopId: "STOP-B",
      legs: [],
      totalFareRp: 25000,
      isJakLingkoCapped: false,
      status: "WAITING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      rollingToken: "token",
      guestEmail: "guest@example.com",
      guestPhone: "+6281234567890",
      idNumber: "3174050101900001",
      seatId: "SEAT-12A",
      serviceClass: "EXECUTIVE",
      reservationCode: "RSV-ABC123",
      claimedByUserId: null,
    };

    expect(ticket.reservationCode).toBe("RSV-ABC123");
    expect(ticket.claimedByUserId).toBeNull();

    const refunded: Ticket = { ...ticket, status: "REFUNDED" };
    const failed: Ticket = { ...ticket, status: "FAILED" };
    expect(refunded.status).toBe("REFUNDED");
    expect(failed.status).toBe("FAILED");
  });
});
