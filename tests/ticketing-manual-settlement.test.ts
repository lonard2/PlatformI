/**
 * RED: payment provider abstraction with a manual-settlement implementation
 * (OCC-confirmed bank transfer/QRIS), plus a shared webhook envelope that
 * dispatches per provider and rejects unknown providers and malformed bodies.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createManualSettlementProvider,
  MANUAL_PROVIDER_ID,
} from "@/lib/ticketing/manualSettlementProvider";
import { POST as webhook } from "@/app/api/ticketing/webhook/[provider]/route";
import { createOperatorSessionToken, OPERATOR_COOKIE_NAME } from "@/lib/services/adminAuthService";
import { db } from "@/lib/db";

const FINANCE = { id: "OCC-FIN-1", role: "FINANCE_OFFICER" };
const CLERK = { id: "OCC-CLERK-1", role: "LINE_CONTROLLER" };

describe("manual settlement provider", () => {
  const provider = createManualSettlementProvider();

  it("creates a charge with human-readable transfer instructions", () => {
    const charge = provider.createCharge({
      amountRp: 150000,
      ticketNumber: "TKT-1",
      reservationCode: "RSV-1",
    });
    expect(charge.paymentRef).toMatch(/^MAN-/);
    expect(charge.amountRp).toBe(150000);
    expect(charge.instructions).toMatch(/RSV-1/);
    expect(charge.instructions).toMatch(/150000|150\.000|Rp/);
  });

  it("confirms only with a finance actor", () => {
    expect(() =>
      provider.confirmPayment({ paymentRef: "MAN-X", actor: CLERK })
    ).toThrow(/finance/i);
    const update = provider.confirmPayment({ paymentRef: "MAN-X", actor: FINANCE });
    expect(update.paymentStatus).toBe("PAID");
    expect(update.paidAt instanceof Date).toBe(true);
  });

  it("keeps a single paidAt on double confirmation", () => {
    const first = provider.confirmPayment({ paymentRef: "MAN-X", actor: FINANCE });
    expect(first.paymentStatus).toBe("PAID");
    expect(first.paidAt).toBeInstanceOf(Date);
    const second = provider.confirmPayment({
      paymentRef: "MAN-X",
      actor: FINANCE,
      current: { paymentStatus: "PAID" },
    });
    expect(second).toEqual({ paymentStatus: "PAID" });
  });

  it("refunds an unused ticket but blocks refunds after gate scan", () => {
    const ok = provider.refundPayment({
      paymentRef: "MAN-X",
      reason: "schedule change",
      actor: FINANCE,
      current: { paymentStatus: "PAID", gateConsumed: false },
    });
    expect(ok.paymentStatus).toBe("REFUNDED");
    expect(ok.refundReason).toBe("schedule change");
    expect(() =>
      provider.refundPayment({ paymentRef: "MAN-X", reason: "x", actor: FINANCE, current: { paymentStatus: "PAID", gateConsumed: true } })
    ).toThrow(/gate|used|consumed/i);
    expect(() =>
      provider.refundPayment({ paymentRef: "MAN-X", reason: "x", actor: FINANCE, current: { paymentStatus: "REFUNDED", gateConsumed: false } })
    ).toThrow(/already/i);
  });
});

describe("ticketing webhook", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.ticket.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
  });

  function webhookReq(provider: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(`http://localhost/api/ticketing/webhook/${provider}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("rejects unknown providers", async () => {
    const res = await webhook(webhookReq("midtrans-x", { provider: "midtrans-x", event: "x", payload: {} }), {
      params: Promise.resolve({ provider: "midtrans-x" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects malformed envelopes", async () => {
    const res = await webhook(webhookReq(MANUAL_PROVIDER_ID, { nonsense: true }), {
      params: Promise.resolve({ provider: MANUAL_PROVIDER_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("requires an operator session for manual settlement events", async () => {
    const res = await webhook(
      webhookReq(MANUAL_PROVIDER_ID, { provider: MANUAL_PROVIDER_ID, event: "payment.confirmed", payload: {} }),
      { params: Promise.resolve({ provider: MANUAL_PROVIDER_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it("confirms payment through the webhook exactly once", async () => {
    const ref = `MAN-RSV-WH-${Date.now()}`;
    const created = await db.ticket.create({
      data: {
        ticketNumber: `TKT-WH-${Date.now()}`,
        userId: "USR-Jakarta-01",
        originStopId: "stop-a",
        destinationStopId: "stop-b",
        legsJson: "[]",
        totalFareRp: 150000,
        status: "WAITING",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        rollingToken: `tok-wh-${Date.now()}`,
        guestPhone: "+6281999000001",
        reservationCode: `WH${Date.now() % 1000000}`,
        paymentStatus: "UNPAID",
        paymentRef: ref,
      },
    });
    createdIds.push(created.id);
    const token = createOperatorSessionToken("OCC-TEST-FIN", "FINANCE_OFFICER");
    const authed = (body: unknown) =>
      webhookReq(
        MANUAL_PROVIDER_ID,
        body,
        { cookie: `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}` }
      );
    const first = await webhook(
      authed({ provider: MANUAL_PROVIDER_ID, event: "payment.confirmed", payload: { paymentRef: ref, proof: "transfer-slip-1" } }),
      { params: Promise.resolve({ provider: MANUAL_PROVIDER_ID }) }
    );
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as { success: boolean; data: { paidAt: string | null } };
    expect(firstJson.data.paidAt).not.toBeNull();
    const second = await webhook(
      authed({ provider: MANUAL_PROVIDER_ID, event: "payment.confirmed", payload: { paymentRef: ref, proof: "transfer-slip-1" } }),
      { params: Promise.resolve({ provider: MANUAL_PROVIDER_ID }) }
    );
    const secondJson = (await second.json()) as { success: boolean; data: { paidAt: string | null } };
    expect(second.status).toBe(200);
    expect(secondJson.data.paidAt).toBe(firstJson.data.paidAt);
  });
});
