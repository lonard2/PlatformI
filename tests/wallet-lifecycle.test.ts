import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { Ticket, TicketStatus } from "@/types/transit";
import { POST as purchasePost } from "@/app/api/ticketing/purchase/route";
import { POST as validatePost } from "@/app/api/ticketing/validate/route";
import { POST as refundPost } from "@/app/api/ticketing/refund/route";
import { GET as guestLookupGet } from "@/app/api/ticketing/guest-lookup/route";
import { readReservationEnvelope } from "@/lib/ticketing/reservationContract";
import { db } from "@/lib/db";

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

const RUN_TAG = Date.now().toString(36).toUpperCase();
const GUEST_PHONE = `+62890${Date.now().toString().slice(-7)}`;
const GUEST_EMAIL = `guest-${Date.now().toString(36)}@example.com`;
const RUN_ID = `RUN-WL-${RUN_TAG}`;
const TRIP_CODE = `AKAP-WL-${RUN_TAG}`;
const TRAVEL_DATE = "2026-11-01";
const ORIGIN_REF = `INTERCITY:${RUN_ID}:ORIGIN`;
const DESTINATION_REF = `INTERCITY:${RUN_ID}:DESTINATION`;
const createdTicketNumbers: string[] = [];

function postJson(handler: (req: NextRequest) => Promise<Response>, url: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const req = new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (handler(req) as Promise<Response>).then(async (res) => ({
    status: res.status,
    json: (await res.json()) as Record<string, unknown>,
  }));
}

function purchaseReservation(body: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown> }> {
  return postJson(purchasePost, "http://localhost:3000/api/ticketing/purchase", body);
}

function validateTicket(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return postJson(validatePost, "http://localhost:3000/api/ticketing/validate", body).then(
    (res) => res.json
  );
}

function refundTicket(ticketNumber: string): Promise<{ status: number; json: Record<string, unknown> }> {
  return postJson(refundPost, "http://localhost:3000/api/ticketing/refund", { ticketNumber });
}

function guestLookup(code: string, phone: string, extra: Record<string, string> = {}): Promise<{ status: number; json: Record<string, unknown> }> {
  const params = new URLSearchParams({ code, phone, ...extra });
  const req = new NextRequest(
    `http://localhost:3000/api/ticketing/guest-lookup?${params.toString()}`
  );
  return (guestLookupGet(req) as Promise<Response>).then(async (res) => ({
    status: res.status,
    json: (await res.json()) as Record<string, unknown>,
  }));
}

function intercityPurchase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    runId: RUN_ID,
    tripCode: TRIP_CODE,
    travelDate: TRAVEL_DATE,
    originStopId: ORIGIN_REF,
    destinationStopId: DESTINATION_REF,
    legs: [
      {
        legIndex: 0,
        lineId: "line-akap-test",
        originStopId: ORIGIN_REF,
        destinationStopId: DESTINATION_REF,
        mode: "AKAP_INTERCITY_BUS",
        fareRp: 180000,
      },
    ],
    totalFareRp: 180000,
    isJakLingkoCapped: false,
    buyer: {
      fullName: "Sinta Guest",
      phone: GUEST_PHONE,
      email: GUEST_EMAIL,
      idNumber: "3174050101900001",
    },
    seatId: "SEAT-12A",
    serviceClass: "EXECUTIVE",
    ...overrides,
  };
}

afterAll(async () => {
  if (createdTicketNumbers.length > 0) {
    await db.ticket.deleteMany({ where: { ticketNumber: { in: createdTicketNumbers } } });
  }
  await db.ticket.deleteMany({ where: { ticketNumber: "TKT-REFUNDED-01" } });
});

describe("reservation lifecycle APIs", () => {
  it("refuses to validate a refunded ticket", async () => {
    await db.ticket.deleteMany({ where: { ticketNumber: "TKT-REFUNDED-01" } });
    const created = await purchaseReservation(
      intercityPurchase({ paymentResult: "success", ticketNumber: "TKT-REFUNDED-01" })
    );
    expect(created.status).toBe(201);
    const refunded = await refundTicket("TKT-REFUNDED-01");
    expect(refunded.json["status"]).toBe("REFUNDED");

    const res = await validateTicket({ ticketNumber: "TKT-REFUNDED-01" });
    expect(res["valid"]).toBe(false);
  });

  it("creates guest reservations with ticketNumber, reservationCode, and WAITING status", async () => {
    const res = await purchaseReservation(intercityPurchase({ tripCode: `${TRIP_CODE}-GUEST` }));
    expect(res.status).toBe(201);
    expect(typeof res.json["ticketNumber"]).toBe("string");
    expect(typeof res.json["reservationCode"]).toBe("string");
    expect(res.json["status"]).toBe("WAITING");
    createdTicketNumbers.push(res.json["ticketNumber"] as string);

    const stored = await db.ticket.findUnique({
      where: { ticketNumber: res.json["ticketNumber"] as string },
    });
    expect(stored?.userId).toBe("guest");
    expect(stored?.guestPhone).toBe(GUEST_PHONE);
    expect(stored?.guestEmail).toBe(GUEST_EMAIL);
    expect(stored?.idNumber).toBe("3174050101900001");
    expect(stored?.seatId).toBe("SEAT-12A");
    expect(stored?.serviceClass).toBe("EXECUTIVE");
    expect(stored?.totalFareRp).toBe(180000);
    expect(stored?.reservationCode).toBe(res.json["reservationCode"]);
    expect(readReservationEnvelope(stored?.legsJson ?? "").trip.buyerFullName).toBe("Sinta Guest");
  });

  it("is idempotent per buyer plus trip plus date", async () => {
    const first = await purchaseReservation(
      intercityPurchase({ tripCode: `${TRIP_CODE}-IDEM`, seatId: "SEAT-12B" })
    );
    const second = await purchaseReservation(
      intercityPurchase({ tripCode: `${TRIP_CODE}-IDEM`, seatId: "SEAT-12C" })
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.json["ticketNumber"]).toBe(first.json["ticketNumber"]);
    expect(second.json["reservationCode"]).toBe(first.json["reservationCode"]);
    createdTicketNumbers.push(first.json["ticketNumber"] as string);
  });

  it("marks failed payments as FAILED and rejects them at validation", async () => {
    const created = await purchaseReservation(
      intercityPurchase({
        tripCode: `${TRIP_CODE}-FAIL`,
        paymentResult: "failed",
      })
    );
    expect(created.json["status"]).toBe("FAILED");
    createdTicketNumbers.push(created.json["ticketNumber"] as string);

    const res = await validateTicket({ ticketNumber: created.json["ticketNumber"] });
    expect(res["valid"]).toBe(false);
    expect(res["reason"]).toBe("TICKET_FAILED");
  });

  it("refunds a waiting reservation and rejects refunds after gate completion", async () => {
    const created = await purchaseReservation(
      intercityPurchase({
        tripCode: `${TRIP_CODE}-REFUND`,
        paymentResult: "success",
      })
    );
    expect(created.json["status"]).toBe("ACTIVE");
    createdTicketNumbers.push(created.json["ticketNumber"] as string);

    const refunded = await refundTicket(created.json["ticketNumber"] as string);
    expect(refunded.json["status"]).toBe("REFUNDED");

    await db.ticket.update({
      where: { ticketNumber: created.json["ticketNumber"] as string },
      data: { status: "COMPLETED", gateScannedAt: new Date() },
    });
    const rejected = await refundTicket(created.json["ticketNumber"] as string);
    expect(rejected.status).toBe(409);
  });

  it("looks up guest tickets without payment data", async () => {
    const created = await purchaseReservation(
      intercityPurchase({ tripCode: `${TRIP_CODE}-LOOKUP` })
    );
    createdTicketNumbers.push(created.json["ticketNumber"] as string);

    const res = await guestLookup(
      created.json["reservationCode"] as string,
      GUEST_PHONE
    );
    expect(res.status).toBe(200);
    const ticket = res.json["ticket"] as Record<string, unknown>;
    expect(ticket["ticketNumber"]).toBe(created.json["ticketNumber"]);
    expect(ticket["reservationCode"]).toBe(created.json["reservationCode"]);
    expect(ticket["buyerFullName"]).toBe("Sinta Guest");
    expect(ticket["totalFareRp"]).toBeUndefined();
    expect(ticket["rollingToken"]).toBeUndefined();
  });

  it("finds a guest ticket by phone plus support fallback when the code is unreadable", async () => {
    const created = await purchaseReservation(
      intercityPurchase({ tripCode: `${TRIP_CODE}-FALLBACK` })
    );
    createdTicketNumbers.push(created.json["ticketNumber"] as string);

    const res = await guestLookup(`WRONG-${RUN_TAG}`, GUEST_PHONE, {
      tripDate: TRAVEL_DATE,
      idNumber: "3174050101900001",
      operator: `${TRIP_CODE}-FALLBACK`,
      journey: RUN_ID,
      routeName: "line-akap-test",
    });
    expect(res.status).toBe(200);
    const ticket = res.json["ticket"] as Record<string, unknown>;
    expect(ticket["ticketNumber"]).toBe(created.json["ticketNumber"]);
    expect(ticket["reservationCode"]).toBe(created.json["reservationCode"]);
    expect(ticket["totalFareRp"]).toBeUndefined();
    expect(ticket["rollingToken"]).toBeUndefined();
  });

  it("returns 404 when support fallback matches no reservation", async () => {
    const res = await guestLookup("", GUEST_PHONE, { tripDate: "2026-12-31" });
    expect(res.status).toBe(404);
  });

  it("returns 404 when support fallback matches more than one reservation", async () => {
    const otherPhone = `+62891${Date.now().toString().slice(-7)}`;
    const otherBuyer = {
      fullName: "Budi Guest",
      phone: otherPhone,
      email: `budi-${Date.now().toString(36)}@example.com`,
      idNumber: "3174050101900002",
    };
    for (const suffix of ["AMB-A", "AMB-B"]) {
      const created = await purchaseReservation(
        intercityPurchase({ tripCode: `${TRIP_CODE}-${suffix}`, buyer: otherBuyer })
      );
      createdTicketNumbers.push(created.json["ticketNumber"] as string);
    }
    const res = await guestLookup("", otherPhone, { tripDate: TRAVEL_DATE });
    expect(res.status).toBe(404);
  });

  it("returns 400 when phone is missing and when neither code nor fallback is given", async () => {
    const missingPhone = await guestLookup(`${TRIP_CODE}-FALLBACK`, "", {
      tripDate: TRAVEL_DATE,
    });
    expect(missingPhone.status).toBe(400);
    const missingBoth = await guestLookup("", GUEST_PHONE);
    expect(missingBoth.status).toBe(400);
  });

  it("returns 500 when the guest lookup database read fails", async () => {
    const originalFindUnique = db.ticket.findUnique;
    db.ticket.findUnique = (() => Promise.reject(new Error("db down"))) as typeof db.ticket.findUnique;
    try {
      const res = await guestLookup("RSV-ANY", GUEST_PHONE);
      expect(res.status).toBe(500);
    } finally {
      db.ticket.findUnique = originalFindUnique;
    }
  });

  it("rejects legs that reference a different run than the endpoints", async () => {
    const res = await purchaseReservation(
      intercityPurchase({
        tripCode: `${TRIP_CODE}-LEG-RUN`,
        legs: [
          {
            legIndex: 0,
            lineId: "line-akap-test",
            originStopId: ORIGIN_REF,
            destinationStopId: "INTERCITY:RUN-OTHER:DESTINATION",
            mode: "AKAP_INTERCITY_BUS",
            fareRp: 180000,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects legs that do not match the reservation endpoints", async () => {
    const res = await purchaseReservation(
      intercityPurchase({
        tripCode: `${TRIP_CODE}-LEG-ENDPOINT`,
        legs: [
          {
            legIndex: 0,
            lineId: "line-akap-test",
            originStopId: ORIGIN_REF,
            destinationStopId: ORIGIN_REF,
            mode: "AKAP_INTERCITY_BUS",
            fareRp: 180000,
          },
        ],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects expired tickets at validation with a reason", async () => {
    const created = await purchaseReservation(
      intercityPurchase({ tripCode: `${TRIP_CODE}-EXPIRED` })
    );
    createdTicketNumbers.push(created.json["ticketNumber"] as string);
    await db.ticket.update({
      where: { ticketNumber: created.json["ticketNumber"] as string },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await validateTicket({ ticketNumber: created.json["ticketNumber"] });
    expect(res["valid"]).toBe(false);
    expect(res["reason"]).toBe("TICKET_EXPIRED");
  });

  it("rejects intercity stop references from mismatched runs", async () => {
    const res = await purchaseReservation(
      intercityPurchase({
        destinationStopId: "INTERCITY:RUN-OTHER:DESTINATION",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects drop-off points outside the operator list", async () => {
    const res = await purchaseReservation(
      intercityPurchase({
        mode: "EXECUTIVE_SHUTTLE",
        tripCode: `${TRIP_CODE}-DROPOFF`,
        dropOffPointId: " civilian home address ",
      })
    );
    expect(res.status).toBe(400);
  });
});
