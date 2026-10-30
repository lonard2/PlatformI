/**
 * RED: members flag bad crowd reports; at 2 distinct-member flags the
 * report quietly counts 4x less in the vehicle aggregate but stays
 * visible; duplicate flags are idempotent; the feed never leaks counts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as flagPost } from "@/app/api/crowdsource/flag/route";
import { POST as checkinPost } from "@/app/api/crowdsource/checkin/route";
import { GET as feedGet } from "@/app/api/crowdsource/feed/route";
import {
  mintMemberSession,
  MEMBER_SESSION_COOKIE,
} from "@/lib/services/memberAuthService";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { db } from "@/lib/db";

const SECRET = "test-flag-secret-zone";
const VEHICLE_ID = TRANSIT_VEHICLES[5].id;
const RUN = Date.now() % 1000000;

function memberCookie(memberId: string): string {
  const token = mintMemberSession(memberId, "MEMBER", SECRET, Math.floor(Date.now() / 1000));
  return `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`;
}

function flagReq(body: unknown, cookie: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = cookie;
  return new NextRequest("http://localhost:3000/api/crowdsource/flag", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function checkin(level: string, userTag: string): Promise<string> {
  const res = await checkinPost(
    new NextRequest("http://localhost:3000/api/crowdsource/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        vehicleId: VEHICLE_ID,
        crowdLevel: level,
        acComfort: "COMFORTABLE",
        userId: `USR-FLAG-${RUN}-${userTag}`,
      }),
    })
  );
  const json = (await res.json()) as { success: boolean; checkIn: { id: string } };
  expect(json.success).toBe(true);
  return json.checkIn.id;
}

describe("crowdsource flags", () => {
  const checkinIds: string[] = [];

  beforeEach(() => {
    process.env.MEMBER_AUTH_SECRET = SECRET;
  });

  afterEach(async () => {
    delete process.env.MEMBER_AUTH_SECRET;
    if (checkinIds.length > 0) {
      await db.crowdsourceFlag.deleteMany({
        where: { checkInId: { in: checkinIds } },
      }).catch(() => {});
      await db.crowdsourceCheckIn.deleteMany({ where: { id: { in: checkinIds } } }).catch(() => {});
      checkinIds.length = 0;
    }
  });

  it("rejects anonymous flags", async () => {
    const res = await flagPost(flagReq({ checkInId: "nope", reason: "spam" }, null));
    expect(res.status).toBe(401);
  });

  it("records one flag per member and stays quiet below threshold", async () => {
    const id = await checkin("LEVEL_2_FEW_SEATS", "A");
    checkinIds.push(id);
    const first = await flagPost(flagReq({ checkInId: id, reason: "wrong vehicle" }, memberCookie("MBR-FLAG-A")));
    expect(first.status).toBe(201);
    const dup = await flagPost(flagReq({ checkInId: id, reason: "wrong vehicle" }, memberCookie("MBR-FLAG-A")));
    expect(dup.status).toBe(200);
    const row = await db.crowdsourceCheckIn.findUnique({ where: { id } });
    expect(row?.flagCount).toBe(1);
    const feed = await feedGet(
      new NextRequest("http://localhost:3000/api/crowdsource/feed?limit=100", { method: "GET" })
    );
    const items = ((await feed.json()) as { feed: Array<Record<string, unknown>> }).feed;
    const mine = items.find((i) => i["id"] === id) as Record<string, unknown> | undefined;
    expect(mine).toBeDefined();
    expect(mine?.["flagged"]).toBe(false);
    expect(mine).not.toHaveProperty("flagCount");
  });

  it("down-weights the aggregate at two distinct flags without hiding the report", async () => {
    await checkin("LEVEL_1_MANY_SEATS", "B1").then((id) => checkinIds.push(id));
    await checkin("LEVEL_1_MANY_SEATS", "B2").then((id) => checkinIds.push(id));
    await checkin("LEVEL_1_MANY_SEATS", "B3").then((id) => checkinIds.push(id));
    const hot = await checkin("LEVEL_4_FULL_CRUSH", "B4");
    checkinIds.push(hot);
    await flagPost(flagReq({ checkInId: hot, reason: "staged photo" }, memberCookie("MBR-FLAG-B1")));
    await flagPost(flagReq({ checkInId: hot, reason: "wrong vehicle" }, memberCookie("MBR-FLAG-B2")));
    const reread = await db.crowdsourceCheckIn.findUnique({ where: { id: hot } });
    expect(reread?.flagCount).toBe(2);
    // Trigger a recompute with one more calm report.
    const probe = await checkinPost(
      new NextRequest("http://localhost:3000/api/crowdsource/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vehicleId: VEHICLE_ID,
          crowdLevel: "LEVEL_1_MANY_SEATS",
          acComfort: "COMFORTABLE",
          userId: `USR-FLAG-${RUN}-B5`,
        }),
      })
    );
    const probeJson = (await probe.json()) as {
      success: boolean;
      checkIn: { id: string };
      computedDensity: { rawWeightedDensity: number };
    };
    expect(probeJson.success).toBe(true);
    checkinIds.push(probeJson.checkIn.id);
    // Unflagged math would be exactly 2.0; the flagged LEVEL_5 counts 4x less.
    expect(probeJson.computedDensity.rawWeightedDensity).toBeLessThan(1.6);
    const feed = await feedGet(
      new NextRequest("http://localhost:3000/api/crowdsource/feed?limit=100", { method: "GET" })
    );
    const items = ((await feed.json()) as { feed: Array<Record<string, unknown>> }).feed;
    const mine = items.find((i) => i["id"] === hot) as Record<string, unknown> | undefined;
    expect(mine).toBeDefined();
    expect(mine?.["flagged"]).toBe(true);
  });

  it("404s on unknown reports", async () => {
    const res = await flagPost(
      flagReq({ checkInId: "CHK-DOES-NOT-EXIST", reason: "x" }, memberCookie("MBR-FLAG-A"))
    );
    expect(res.status).toBe(404);
  });
});
