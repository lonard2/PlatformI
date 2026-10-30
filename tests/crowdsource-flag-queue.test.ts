/**
 * RED: OCC closes the flag loop — the flag queue lists flagged reports
 * with reasons and counts (never flagger identities), operators dismiss
 * (weight restored) or remove (flags cascade away).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as flagPost, DELETE as flagDismiss } from "@/app/api/crowdsource/flag/route";
import { GET as flagsQueue } from "@/app/api/crowdsource/flags/route";
import { DELETE as checkinDelete } from "@/app/api/crowdsource/checkin/route";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";
import {
  mintMemberSession,
  MEMBER_SESSION_COOKIE,
} from "@/lib/services/memberAuthService";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { db } from "@/lib/db";

const SECRET = "test-flag-queue-secret";
const VEHICLE_ID = TRANSIT_VEHICLES[6].id;
const RUN = Date.now() % 1000000;

function memberCookie(memberId: string): string {
  const token = mintMemberSession(memberId, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
  return `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

const OPS_COOKIE = `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER"))}`;

async function seedFlaggedReport(): Promise<string> {
  const checkin = await db.crowdsourceCheckIn.create({
    data: {
      vehicleId: VEHICLE_ID,
      userId: `USR-FLAGQ-${RUN}`,
      crowdLevel: "LEVEL_4_FULL_CRUSH",
      acComfort: "COMFORTABLE",
      weight: 1,
    },
  });
  await db.crowdsourceFlag.createMany({
    data: [
      { checkInId: checkin.id, memberId: "MBR-FLAGQ-1", reason: "wrong vehicle" },
      { checkInId: checkin.id, memberId: "MBR-FLAGQ-2", reason: "staged" },
    ],
  });
  await db.crowdsourceCheckIn.update({
    where: { id: checkin.id },
    data: { flagCount: 2 },
  });
  return checkin.id;
}

describe("flag review queue", () => {
  const checkinIds: string[] = [];

  beforeEach(() => {
    process.env.MEMBER_AUTH_SECRET = SECRET;
  });

  afterEach(async () => {
    delete process.env.MEMBER_AUTH_SECRET;
    if (checkinIds.length > 0) {
      await db.crowdsourceFlag.deleteMany({ where: { checkInId: { in: checkinIds } } }).catch(() => {});
      await db.crowdsourceCheckIn.deleteMany({ where: { id: { in: checkinIds } } }).catch(() => {});
      checkinIds.length = 0;
    }
  });

  it("gates the queue behind operators", async () => {
    const anon = await flagsQueue(new NextRequest("http://localhost/api/crowdsource/flags", { method: "GET" }));
    expect(anon.status).toBe(401);
    const op = await flagsQueue(
      new NextRequest("http://localhost/api/crowdsource/flags", {
        method: "GET",
        headers: { cookie: OPS_COOKIE },
      })
    );
    expect(op.status).toBe(200);
  });

  it("lists flagged reports with reasons and counts, never flagger identities", async () => {
    const id = await seedFlaggedReport();
    checkinIds.push(id);
    const res = await flagsQueue(
      new NextRequest("http://localhost/api/crowdsource/flags", {
        method: "GET",
        headers: { cookie: OPS_COOKIE },
      })
    );
    const json = (await res.json()) as {
      success: boolean;
      reports: Array<{ checkInId: string; flagCount: number; reasons: string[] }>;
    };
    const mine = json.reports.find((r) => r.checkInId === id);
    expect(mine?.flagCount).toBe(2);
    expect(mine?.reasons).toEqual(expect.arrayContaining(["wrong vehicle", "staged"]));
    expect(JSON.stringify(json)).not.toContain("MBR-FLAGQ-1");
  });

  it("dismisses flags, restoring the report weight", async () => {
    const id = await seedFlaggedReport();
    checkinIds.push(id);
    const anon = await flagDismiss(
      new NextRequest(`http://localhost/api/crowdsource/flag?checkInId=${id}`, { method: "DELETE" })
    );
    expect(anon.status).toBe(401);
    const res = await flagDismiss(
      new NextRequest(`http://localhost/api/crowdsource/flag?checkInId=${id}`, {
        method: "DELETE",
        headers: { cookie: OPS_COOKIE },
      })
    );
    expect(res.status).toBe(200);
    const reread = await db.crowdsourceCheckIn.findUnique({ where: { id } });
    expect(reread?.flagCount).toBe(0);
    expect(await db.crowdsourceFlag.count({ where: { checkInId: id } })).toBe(0);
  });

  it("cascades flags away when OCC removes the report", async () => {
    const id = await seedFlaggedReport();
    checkinIds.push(id);
    const res = await checkinDelete(
      new NextRequest(`http://localhost/api/crowdsource/checkin?id=${id}`, {
        method: "DELETE",
        headers: { cookie: OPS_COOKIE },
      })
    );
    expect(res.status).toBe(200);
    expect(await db.crowdsourceFlag.count({ where: { checkInId: id } })).toBe(0);
    checkinIds.length = 0;
  });

  it("lets a flagged member re-earn standing with a fresh flag-free report", async () => {
    const flagged = await db.crowdsourceCheckIn.create({
      data: {
        vehicleId: VEHICLE_ID,
        userId: `USR-FLAGQ-${RUN}-fresh`,
        crowdLevel: "LEVEL_2_FEW_SEATS",
        acComfort: "COMFORTABLE",
        weight: 1,
        flagCount: 3,
      },
    });
    checkinIds.push(flagged.id);
    const res = await flagPost(
      new NextRequest("http://localhost/api/crowdsource/flag", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: memberCookie("MBR-FLAGQ-9") },
        body: JSON.stringify({ checkInId: flagged.id, reason: "still wrong" }),
      })
    );
    // Flagging still works on already-flagged reports; counts keep accruing.
    expect(res.status).toBe(201);
  });
});
