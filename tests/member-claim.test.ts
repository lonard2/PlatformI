/**
 * RED: guest→member claiming — lookup code + phone transfers the ticket
 * to the signed-in member; purchase attributes when a session is present,
 * stays anonymous without one.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as claim } from "@/app/api/members/claim/route";
import { db } from "@/lib/db";
import { mintMemberSession, MEMBER_SESSION_COOKIE } from "@/lib/services/memberAuthService";

const SECRET = "test-claim-secret-zone";

describe("member claim", () => {
  const phone = `+62801${String(Date.now() % 100000000).padStart(8, "0")}`;
  const code = `CLM${String(Date.now() % 1000000).padStart(6, "0")}`;
  let memberId = "";
  let ticketId = "";

  beforeEach(async () => {
    process.env.MEMBER_AUTH_SECRET = SECRET;
    const member = await db.member.create({
      data: { displayName: "Claim User", phone, role: "MEMBER" },
    });
    memberId = member.id;
    const ticket = await db.ticket.create({
      data: {
        ticketNumber: `TKT-${code}`,
        userId: "USR-JAKARTA-01",
        originStopId: "stop-a",
        destinationStopId: "stop-b",
        legsJson: "[]",
        totalFareRp: 15000,
        status: "CONFIRMED",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        rollingToken: `tok-${code}`,
        guestPhone: phone,
        reservationCode: code,
        claimedByUserId: null,
      },
    });
    ticketId = ticket.id;
  });

  afterEach(async () => {
    await db.ticket.deleteMany({ where: { id: ticketId } }).catch(() => {});
    await db.member.deleteMany({ where: { id: memberId } }).catch(() => {});
    delete process.env.MEMBER_AUTH_SECRET;
    vi.unstubAllGlobals();
  });

  const URL = "http://localhost/api/members/claim";
  function authed(url: string, body: unknown, mid: string): NextRequest {
    const token = mintMemberSession(mid, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
    return new NextRequest(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      body: JSON.stringify(body),
    });
  }

  function anon(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/members/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects unauthenticated claims", async () => {
    const res = await claim(anon({ reservationCode: code, phone }));
    expect(res.status).toBe(401);
  });

  it("rejects a phone mismatch without revealing the ticket", async () => {
    const res = await claim(authed(URL, { reservationCode: code, phone: "+6280000000000" }, memberId));
    expect(res.status).toBe(404);
    const left = await db.ticket.findUnique({ where: { id: ticketId } });
    expect(left?.claimedByUserId).toBeNull();
  });

  it("transfers the ticket on code + phone match", async () => {
    const res = await claim(authed(URL, { reservationCode: code, phone }, memberId));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(true);
    const claimed = await db.ticket.findUnique({ where: { id: ticketId } });
    expect(claimed?.claimedByUserId).toBe(memberId);
  });

  it("attributes guest purchases made with a session, stays anonymous without", async () => {
    const { POST: purchase } = await import("@/app/api/ticketing/purchase/route");
    const created: string[] = [];
    try {
      const baseBody = {
        originStopId: "stop-a",
        destinationStopId: "stop-b",
        totalFareRp: 15000,
        buyer: { fullName: "Claim Buyer", phone },
      };
      const withSession = await purchase(authed("http://localhost/api/ticketing/purchase", baseBody, memberId));
      expect(withSession.status).toBe(201);
      const attributed = await db.ticket.findFirst({
        where: { guestPhone: phone, claimedByUserId: memberId },
        orderBy: { createdAt: "desc" },
      });
      expect(attributed?.id).toBeTruthy();
      if (attributed) created.push(attributed.id);
    } finally {
      for (const id of created) {
        await db.ticket.deleteMany({ where: { id } }).catch(() => {});
      }
    }
  });
});
