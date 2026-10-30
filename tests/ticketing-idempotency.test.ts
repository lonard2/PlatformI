/**
 * RED: explicit idempotency keys on purchase — a repeated key returns the
 * original ticket without creating a second row; a reused key with a
 * conflicting payload is rejected.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as purchase } from "@/app/api/ticketing/purchase/route";
import { db } from "@/lib/db";

const PHONE = "+628990000001";

function intercityBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: "guest",
    originStopId: "INTERCITY:RUN-TEST-1:ORIGIN",
    destinationStopId: "INTERCITY:RUN-TEST-1:DESTINATION",
    runId: "RUN-TEST-1",
    tripCode: "KA-TEST-1",
    travelDate: "2026-12-01",
    legs: [
      {
        legIndex: 0,
        lineId: "line-kai-intercity",
        originStopId: "INTERCITY:RUN-TEST-1:ORIGIN",
        destinationStopId: "INTERCITY:RUN-TEST-1:DESTINATION",
        mode: "KAI_INTERCITY",
        fareRp: 150000,
      },
    ],
    totalFareRp: 150000,
    buyer: { fullName: "Idem Poten", phone: PHONE },
    ...overrides,
  };
}

function reqWithKey(body: unknown, key?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== undefined) headers["Idempotency-Key"] = key;
  return new NextRequest("http://localhost/api/ticketing/purchase", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("ticketing idempotency", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    await db.ticket.deleteMany({ where: { guestPhone: PHONE } }).catch(() => {});
    createdIds.length = 0;
    vi.unstubAllGlobals();
  });

  it("replays the same ticket for a repeated Idempotency-Key without a second row", async () => {
    const key = `idem-${Date.now()}`;
    const first = await purchase(reqWithKey(intercityBody(), key));
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as { ticketNumber: string; idempotentReplay?: boolean };
    expect(firstJson.idempotentReplay ?? false).toBe(false);
    createdIds.push(firstJson.ticketNumber);

    const second = await purchase(reqWithKey(intercityBody(), key));
    expect([200, 201]).toContain(second.status);
    const secondJson = (await second.json()) as { ticketNumber: string; idempotentReplay?: boolean };
    expect(secondJson.idempotentReplay).toBe(true);
    expect(secondJson.ticketNumber).toBe(firstJson.ticketNumber);
    expect(await db.ticket.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("rejects a reused key with a conflicting payload", async () => {
    const key = `idem-conflict-${Date.now()}`;
    const first = await purchase(reqWithKey(intercityBody(), key));
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as { ticketNumber: string };
    createdIds.push(firstJson.ticketNumber);

    const conflict = await purchase(
      reqWithKey(intercityBody({ totalFareRp: 999999, legs: [] }), key)
    );
    expect(conflict.status).toBe(409);
    expect(await db.ticket.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("creates normally without a key", async () => {
    const res = await purchase(reqWithKey(intercityBody()));
    expect(res.status).toBe(201);
    const json = (await res.json()) as { ticketNumber: string; idempotentReplay?: boolean };
    createdIds.push(json.ticketNumber);
    expect(json.idempotentReplay ?? false).toBe(false);
  });
});
