/**
 * RED: member incentives — verified reports weigh more (capped, never
 * immune), verified members cool down faster, saved trips round-trip
 * under ownership checks, purchase history lists claimed tickets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  reporterWeightFor,
  cooldownSecondsFor,
  VERIFIED_WEIGHT_MULTIPLIER,
  VERIFIED_COOLDOWN_SECONDS,
  STANDARD_COOLDOWN_SECONDS,
} from "@/lib/services/memberTrust";
import { mintMemberSession, MEMBER_SESSION_COOKIE } from "@/lib/services/memberAuthService";

const SECRET = "test-incentives-secret-zone";

describe("member incentives", () => {
  it("weights verified reporters more, capped, guests at unity", () => {
    expect(reporterWeightFor(null)).toBe(1);
    expect(reporterWeightFor({ id: "m1", role: "MEMBER", verifiedAt: null })).toBe(1);
    expect(reporterWeightFor({ id: "m2", role: "MEMBER", verifiedAt: new Date().toISOString() })).toBe(
      VERIFIED_WEIGHT_MULTIPLIER
    );
    expect(VERIFIED_WEIGHT_MULTIPLIER).toBeLessThanOrEqual(3);
  });

  it("shortens cooldown for verified members only", () => {
    expect(cooldownSecondsFor(null)).toBe(STANDARD_COOLDOWN_SECONDS);
    expect(cooldownSecondsFor({ id: "m1", role: "MEMBER", verifiedAt: null })).toBe(
      STANDARD_COOLDOWN_SECONDS
    );
    expect(cooldownSecondsFor({ id: "m2", role: "MEMBER", verifiedAt: new Date().toISOString() })).toBe(
      VERIFIED_COOLDOWN_SECONDS
    );
    expect(VERIFIED_COOLDOWN_SECONDS).toBeLessThan(STANDARD_COOLDOWN_SECONDS);
  });

  it("saved trips round-trip under ownership checks", async () => {
    const { POST: createTrips } = await import("@/app/api/members/trips/route");
    const { GET: listTrips } = await import("@/app/api/members/trips/route");
    const owner = await db.member.create({
      data: { displayName: "Trip Owner", phone: `+62802${Date.now() % 100000000}` },
    });
    const stranger = await db.member.create({
      data: { displayName: "Stranger", phone: `+62803${Date.now() % 100000000}` },
    });
    const cookieFor = (id: string) => {
      const token = mintMemberSession(id, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
      return `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`;
    };
    process.env.MEMBER_AUTH_SECRET = SECRET;
    try {
      const created = await createTrips(
        new NextRequest("http://localhost/api/members/trips", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: cookieFor(owner.id) },
          body: JSON.stringify({ origin: "Blok M", destination: "Bundaran HI", label: "Commute" }),
        })
      );
      expect(created.status).toBe(201);
      const listed = await listTrips(
        new NextRequest("http://localhost/api/members/trips", { headers: { cookie: cookieFor(owner.id) } })
      );
      const listedJson = (await listed.json()) as { success: boolean; data: { id: string }[] };
      expect(listedJson.success).toBe(true);
      expect(listedJson.data).toHaveLength(1);

      const { DELETE: deleteTrip } = await import("@/app/api/members/trips/[id]/route");
      const tripId = listedJson.data[0].id;
      const strangerDel = await deleteTrip(
        new NextRequest(`http://localhost/api/members/trips/${tripId}`, { method: "DELETE", headers: { cookie: cookieFor(stranger.id) } }),
        { params: Promise.resolve({ id: tripId }) }
      );
      expect(strangerDel.status).toBe(404);
      const ownerDel = await deleteTrip(
        new NextRequest(`http://localhost/api/members/trips/${tripId}`, { method: "DELETE", headers: { cookie: cookieFor(owner.id) } }),
        { params: Promise.resolve({ id: tripId }) }
      );
      expect(ownerDel.status).toBe(200);
    } finally {
      await db.savedTrip.deleteMany({ where: { memberId: { in: [owner.id, stranger.id] } } }).catch(() => {});
      await db.member.deleteMany({ where: { id: { in: [owner.id, stranger.id] } } }).catch(() => {});
      delete process.env.MEMBER_AUTH_SECRET;
      vi.unstubAllGlobals();
    }
  });

  it("purchase history lists only the member's claimed tickets", async () => {
    const { GET: history } = await import("@/app/api/members/tickets/route");
    const owner = await db.member.create({
      data: { displayName: "History Owner", phone: `+62804${Date.now() % 100000000}` },
    });
    const stamp = Date.now();
    const mk = (claimedBy: string | null, idx: number) =>
      db.ticket.create({
        data: {
          ticketNumber: `TKT-H${stamp}-${idx}`,
          userId: "USR-JAKARTA-01",
          originStopId: "stop-a",
          destinationStopId: "stop-b",
          legsJson: "[]",
          totalFareRp: 15000,
          status: "CONFIRMED",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          rollingToken: `tok-H${stamp}-${idx}`,
          guestPhone: `+62804${Date.now() % 100000000}`,
          reservationCode: `HST${stamp % 1000000}-${idx}`,
          claimedByUserId: claimedBy,
        },
      });
    const mine = await mk(owner.id, 1);
    const theirs = await mk(null, 2);
    process.env.MEMBER_AUTH_SECRET = SECRET;
    try {
      const token = mintMemberSession(owner.id, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
      const res = await history(
        new NextRequest("http://localhost/api/members/tickets", {
          headers: { cookie: `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}` },
        })
      );
      const json = (await res.json()) as { success: boolean; data: { id: string }[] };
      expect(json.success).toBe(true);
      expect(json.data.map((t) => t.id)).toEqual([mine.id]);
      expect(json.data.map((t) => t.id)).not.toContain(theirs.id);
    } finally {
      await db.ticket.deleteMany({ where: { id: { in: [mine.id, theirs.id] } } }).catch(() => {});
      await db.member.deleteMany({ where: { id: owner.id } }).catch(() => {});
      delete process.env.MEMBER_AUTH_SECRET;
    }
  });
});
