/**
 * RED: money moves only with finance authorization — non-finance operators
 * are rejected, supervisors are required for large refunds, gate-consumed
 * tickets stay non-refundable, and every money action records its actor.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as financeConfirm } from "@/app/api/finance/confirm/route";
import { POST as financeRefund } from "@/app/api/finance/refund/route";
import { GET as financeQueue } from "@/app/api/finance/queue/route";
import { POST as legacyRefund } from "@/app/api/ticketing/refund/route";
import { OPERATOR_COOKIE_NAME, createOperatorSessionToken } from "@/lib/services/adminAuthService";
import { db } from "@/lib/db";

function authed(url: string, body: unknown, role: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (role !== null) {
    const token = createOperatorSessionToken(`OCC-TEST-${role}`, role);
    headers.cookie = `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }
  return new NextRequest(url, { method: "POST", headers, body: JSON.stringify(body) });
}

let serial = 0;
async function seedTicket(totalFareRp: number, status = "WAITING", gateScannedAt: Date | null = null) {
  serial += 1;
  const tag = `${Date.now() % 1000000}-${serial}`;
  return db.ticket.create({
    data: {
      ticketNumber: `TKT-FIN-${tag}`,
      userId: "USR-Jakarta-01",
      originStopId: "stop-a",
      destinationStopId: "stop-b",
      legsJson: "[]",
      totalFareRp,
      status,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      rollingToken: `tok-fin-${tag}`,
      guestPhone: "+6281999000001",
      reservationCode: `FIN${tag}`,
      paymentStatus: status === "REFUNDED" ? "REFUNDED" : "UNPAID",
      gateScannedAt,
    },
  });
}

describe("finance authorization", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.ticket.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
  });

  it("rejects unauthenticated money calls", async () => {
    const t = await seedTicket(100000);
    createdIds.push(t.id);
    const noAuth = await financeConfirm(authed("http://localhost/api/finance/confirm", { ticketNumber: t.ticketNumber }, null));
    expect(noAuth.status).toBe(401);
  });

  it("rejects non-finance operators", async () => {
    const t = await seedTicket(100000);
    createdIds.push(t.id);
    const res = await financeConfirm(
      authed("http://localhost/api/finance/confirm", { ticketNumber: t.ticketNumber }, "LINE_CONTROLLER")
    );
    expect(res.status).toBe(403);
    const reread = await db.ticket.findUnique({ where: { id: t.id } });
    expect(reread?.paymentStatus).toBe("UNPAID");
  });

  it("confirms an unpaid ticket and records the actor", async () => {
    const t = await seedTicket(100000);
    createdIds.push(t.id);
    const res = await financeConfirm(
      authed("http://localhost/api/finance/confirm", { ticketNumber: t.ticketNumber, paymentRef: "MAN-RSV-1", proof: "slip-1" }, "FINANCE_OFFICER")
    );
    expect(res.status).toBe(200);
    const reread = await db.ticket.findUnique({ where: { id: t.id } });
    expect(reread?.paymentStatus).toBe("PAID");
    expect(reread?.paidAt).not.toBeNull();
    expect(reread?.confirmedBy).toBe("OCC-TEST-FINANCE_OFFICER");
  });

  it("escalates large refunds to a supervisor", async () => {
    const t = await seedTicket(600000);
    createdIds.push(t.id);
    await financeConfirm(
      authed("http://localhost/api/finance/confirm", { ticketNumber: t.ticketNumber }, "FINANCE_OFFICER")
    );
    const officerOnly = await financeRefund(
      authed("http://localhost/api/finance/refund", { ticketNumber: t.ticketNumber, reason: "cancel" }, "FINANCE_OFFICER")
    );
    expect(officerOnly.status).toBe(403);
    const still = await db.ticket.findUnique({ where: { id: t.id } });
    expect(still?.paymentStatus).toBe("PAID");
    const sup = await financeRefund(
      authed("http://localhost/api/finance/refund", { ticketNumber: t.ticketNumber, reason: "cancel" }, "FINANCE_SUPERVISOR")
    );
    expect(sup.status).toBe(200);
    const refunded = await db.ticket.findUnique({ where: { id: t.id } });
    expect(refunded?.paymentStatus).toBe("REFUNDED");
    expect(refunded?.refundedBy).toBe("OCC-TEST-FINANCE_SUPERVISOR");
  });

  it("allows officers to refund below the threshold", async () => {
    const t = await seedTicket(150000);
    createdIds.push(t.id);
    await financeConfirm(
      authed("http://localhost/api/finance/confirm", { ticketNumber: t.ticketNumber }, "FINANCE_SUPERVISOR")
    );
    const res = await financeRefund(
      authed("http://localhost/api/finance/refund", { ticketNumber: t.ticketNumber, reason: "cancel" }, "FINANCE_OFFICER")
    );
    expect(res.status).toBe(200);
  });

  it("blocks refunds after gate scan even for finance roles", async () => {
    const t = await seedTicket(150000, "COMPLETED", new Date());
    createdIds.push(t.id);
    const res = await financeRefund(
      authed("http://localhost/api/finance/refund", { ticketNumber: t.ticketNumber, reason: "cancel" }, "FINANCE_SUPERVISOR")
    );
    expect([400, 409]).toContain(res.status);
    const reread = await db.ticket.findUnique({ where: { id: t.id } });
    expect(reread?.paymentStatus).not.toBe("REFUNDED");
  });

  it("gates the legacy refund route behind finance auth", async () => {
    const t = await seedTicket(100000);
    createdIds.push(t.id);
    const anon = await legacyRefund(
      new NextRequest("http://localhost/api/ticketing/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketNumber: t.ticketNumber }),
      })
    );
    expect(anon.status).toBe(401);
    const clerk = await legacyRefund(
      authed("http://localhost/api/ticketing/refund", { ticketNumber: t.ticketNumber }, "LINE_CONTROLLER")
    );
    expect(clerk.status).toBe(403);
  });

  it("serves the finance queue to finance roles only", async () => {
    const t = await seedTicket(120000);
    createdIds.push(t.id);
    const anon = await financeQueue(
      new NextRequest("http://localhost/api/finance/queue", { method: "GET" })
    );
    expect(anon.status).toBe(401);
    const clerkToken = createOperatorSessionToken("OCC-TEST-LINE_CONTROLLER", "LINE_CONTROLLER");
    const clerk = await financeQueue(
      new NextRequest("http://localhost/api/finance/queue", {
        method: "GET",
        headers: { cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(clerkToken)}` },
      })
    );
    expect(clerk.status).toBe(403);
    const officerToken = createOperatorSessionToken("OCC-TEST-FINANCE_OFFICER", "FINANCE_OFFICER");
    const res = await financeQueue(
      new NextRequest("http://localhost/api/finance/queue", {
        method: "GET",
        headers: { cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(officerToken)}` },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      tickets: Array<{ ticketNumber: string; paymentStatus: string }>;
    };
    expect(json.success).toBe(true);
    expect(json.tickets.some((row) => row.ticketNumber === t.ticketNumber)).toBe(true);
  });
});
