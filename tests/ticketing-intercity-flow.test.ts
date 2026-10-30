/**
 * RED: intercity reserve-then-pay — the hub reserves WAITING (never ACTIVE
 * without payment), shows transfer instructions with the payment ref, and
 * the reservation flips to ACTIVE only after OCC finance confirms.
 * Covers guest (code + phone lookup) and member (claimedByUserId) flows.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as purchasePost } from "@/app/api/ticketing/purchase/route";
import { POST as financeConfirm } from "@/app/api/finance/confirm/route";
import { GET as guestLookup } from "@/app/api/ticketing/guest-lookup/route";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";
import {
  mintMemberSession,
  MEMBER_SESSION_COOKIE,
} from "@/lib/services/memberAuthService";
import { db } from "@/lib/db";

const MEMBER_SECRET = "test-intercity-flow-secret";
let serial = 0;

function reserveBody(phone: string, tripCode: string) {
  return {
    userId: "guest",
    runId: "RUN-FLOW-01",
    tripCode,
    travelDate: "2026-11-02",
    originStopId: "INTERCITY:RUN-FLOW-01:ORIGIN",
    destinationStopId: "INTERCITY:RUN-FLOW-01:DESTINATION",
    legs: [
      {
        legIndex: 0,
        lineId: "line-akamai",
        originStopId: "INTERCITY:RUN-FLOW-01:ORIGIN",
        destinationStopId: "INTERCITY:RUN-FLOW-01:DESTINATION",
        mode: "AKAP_BUS",
        fareRp: 150000,
      },
    ],
    totalFareRp: 150000,
    isJakLingkoCapped: false,
    buyer: { fullName: "Flow Tester", phone },
    seatId: "SEAT-1A",
    serviceClass: "EXECUTIVE",
    paymentResult: "pending",
  };
}

function postPurchase(body: Record<string, unknown>, cookie?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const req = new NextRequest("http://localhost:3000/api/ticketing/purchase", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return (purchasePost(req) as Promise<Response>).then(async (res) => ({
    status: res.status,
    json: (await res.json()) as Record<string, unknown>,
  }));
}

describe("intercity reserve-then-pay", () => {
  const createdIds: string[] = [];

  beforeEach(() => {
    process.env.MEMBER_AUTH_SECRET = MEMBER_SECRET;
  });

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.ticket.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
    delete process.env.MEMBER_AUTH_SECRET;
  });

  it("reserves WAITING with transfer instructions, flips ACTIVE only on OCC confirm", async () => {
    serial += 1;
    const phone = `+62890${String(Date.now() % 100000000).padStart(8, "0")}`;
    const created = await postPurchase(reserveBody(phone, `FLOW-G-${Date.now() % 100000}-${serial}`));
    expect(created.status).toBe(201);
    expect(created.json["status"]).toBe("WAITING");
    const createdRow = await db.ticket.findUnique({
      where: { ticketNumber: created.json["ticketNumber"] as string },
    });
    expect(createdRow).not.toBeNull();
    if (createdRow) createdIds.push(createdRow.id);
    expect(createdRow?.paymentStatus).toBe("UNPAID");
    // The reservation carries its charge: ref + human instructions.
    expect(typeof created.json["paymentRef"]).toBe("string");
    expect(created.json["paymentRef"] as string).toMatch(/^MAN-/);
    expect(typeof created.json["paymentInstructions"]).toBe("string");
    expect(created.json["paymentInstructions"] as string).toContain(
      created.json["reservationCode"] as string
    );

    // Guest lookup sees the reservation while still unpaid.
    const lookup = await guestLookup(
      new NextRequest(
        `http://localhost/api/ticketing/guest-lookup?code=${created.json["reservationCode"]}&phone=${encodeURIComponent(phone)}`,
        { method: "GET" }
      )
    );
    expect(lookup.status).toBe(200);
    expect(((await lookup.json()) as { ticket: { status: string } }).ticket.status).toBe("WAITING");

    // OCC finance confirms against the transfer proof.
    const token = createOperatorSessionToken("OCC-TEST-FINANCE_OFFICER", "FINANCE_OFFICER");
    const confirmed = await financeConfirm(
      new NextRequest("http://localhost/api/finance/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}`,
        },
        body: JSON.stringify({ ticketNumber: created.json["ticketNumber"] }),
      })
    );
    expect(confirmed.status).toBe(200);

    const relayout = await guestLookup(
      new NextRequest(
        `http://localhost/api/ticketing/guest-lookup?code=${created.json["reservationCode"]}&phone=${encodeURIComponent(phone)}`,
        { method: "GET" }
      )
    );
    expect((((await relayout.json()) as { ticket: { status: string } }).ticket.status)).toBe("ACTIVE");
  });

  it("attributes member reservations without activating them early", async () => {
    serial += 1;
    const phone = `+62891${String(Date.now() % 100000000).padStart(8, "0")}`;
    const member = await db.member.create({
      data: { displayName: "Flow Member", phone, role: "MEMBER" },
    });
    const memberToken = mintMemberSession(member.id, "MEMBER", MEMBER_SECRET, Math.floor(Date.now() / 1000));
    const created = await postPurchase(
      reserveBody(phone, `FLOW-M-${Date.now() % 100000}-${serial}`),
      `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(memberToken)}`
    );
    expect(created.status).toBe(201);
    expect(created.json["status"]).toBe("WAITING");
    const row = await db.ticket.findUnique({
      where: { ticketNumber: created.json["ticketNumber"] as string },
    });
    expect(row?.claimedByUserId).toBe(member.id);
    expect(row?.paymentStatus).toBe("UNPAID");
    if (row) createdIds.push(row.id);
    await db.member.deleteMany({ where: { id: member.id } }).catch(() => {});
  });
});
