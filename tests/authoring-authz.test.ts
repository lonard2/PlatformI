/**
 * RED: OCC authoring writes require an authenticated operator. Every
 * mutation verb on every authoring surface returns 401 without a session;
 * public reads stay open; demo credentials refuse in production.
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as alertsPost, PATCH as alertsPatch, DELETE as alertsDelete } from "@/app/api/alerts/route";
import { POST as fleetPost, PUT as fleetPut, DELETE as fleetDelete } from "@/app/api/fleet/vehicles/route";
import { POST as linesPost, PUT as linesPut, DELETE as linesDelete } from "@/app/api/network/lines/route";
import { POST as stopsPost, PUT as stopsPut, DELETE as stopsDelete } from "@/app/api/network/stops/route";
import { POST as regionsPost, PUT as regionsPut, DELETE as regionsDelete } from "@/app/api/network/regions/route";
import { POST as timetablesPost, PUT as timetablesPut, DELETE as timetablesDelete } from "@/app/api/network/timetables/route";
import { POST as operatorsPost, PUT as operatorsPut, DELETE as operatorsDelete } from "@/app/api/intercity/operators/route";
import { POST as pointsPost, PUT as pointsPut, DELETE as pointsDelete } from "@/app/api/intercity/boarding-points/route";
import { DELETE as checkinDelete } from "@/app/api/crowdsource/checkin/route";
import { GET as alertsGet } from "@/app/api/alerts/route";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
  authenticateOperator,
} from "@/lib/services/adminAuthService";

type Handler = (req: NextRequest) => Promise<Response>;

const MUTATIONS: Array<[string, Handler, string]> = [
  ["alerts POST", alertsPost, "http://localhost/api/alerts"],
  ["alerts PATCH", alertsPatch, "http://localhost/api/alerts"],
  ["alerts DELETE", alertsDelete, "http://localhost/api/alerts?id=nope"],
  ["fleet POST", fleetPost, "http://localhost/api/fleet/vehicles"],
  ["fleet PUT", fleetPut, "http://localhost/api/fleet/vehicles"],
  ["fleet DELETE", fleetDelete, "http://localhost/api/fleet/vehicles?id=nope"],
  ["lines POST", linesPost, "http://localhost/api/network/lines"],
  ["lines PUT", linesPut, "http://localhost/api/network/lines"],
  ["lines DELETE", linesDelete, "http://localhost/api/network/lines?id=nope"],
  ["stops POST", stopsPost, "http://localhost/api/network/stops"],
  ["stops PUT", stopsPut, "http://localhost/api/network/stops"],
  ["stops DELETE", stopsDelete, "http://localhost/api/network/stops?id=nope"],
  ["regions POST", regionsPost, "http://localhost/api/network/regions"],
  ["regions PUT", regionsPut, "http://localhost/api/network/regions"],
  ["regions DELETE", regionsDelete, "http://localhost/api/network/regions?id=nope"],
  ["timetables POST", timetablesPost, "http://localhost/api/network/timetables"],
  ["timetables PUT", timetablesPut, "http://localhost/api/network/timetables"],
  ["timetables DELETE", timetablesDelete, "http://localhost/api/network/timetables?id=nope"],
  ["operators POST", operatorsPost, "http://localhost/api/intercity/operators"],
  ["operators PUT", operatorsPut, "http://localhost/api/intercity/operators"],
  ["operators DELETE", operatorsDelete, "http://localhost/api/intercity/operators?id=nope"],
  ["boarding-points POST", pointsPost, "http://localhost/api/intercity/boarding-points"],
  ["boarding-points PUT", pointsPut, "http://localhost/api/intercity/boarding-points"],
  ["boarding-points DELETE", pointsDelete, "http://localhost/api/intercity/boarding-points?id=nope"],
  ["checkin DELETE", checkinDelete, "http://localhost/api/crowdsource/checkin?id=nope"],
];

function req(url: string, cookie: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = cookie;
  const init: { method: string; headers: Record<string, string>; body?: string } = { method: "POST", headers };
  if (!url.includes("?id=")) init.body = JSON.stringify({});
  return new NextRequest(url, init);
}

describe("authoring write authz", () => {
  it("rejects every unauthenticated mutation with 401", async () => {
    for (const [name, handler, url] of MUTATIONS) {
      const res = await handler(req(url, null));
      expect(res.status, name).toBe(401);
    }
  });

  it("rejects forged operator tokens", async () => {
    const res = await alertsPost(
      req("http://localhost/api/alerts", `${OPERATOR_COOKIE_NAME}=forged-token`)
    );
    expect(res.status).toBe(401);
  });

  it("lets an authenticated operator through (404 proves the gate passed)", async () => {
    const token = createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER");
    const res = await alertsPatch(
      req("http://localhost/api/alerts", `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(token)}`)
    );
    // Any non-401 proves authentication passed; the id does not exist.
    expect([400, 404]).toContain(res.status);
  });

  it("keeps public reads open", async () => {
    const res = await alertsGet(
      new NextRequest("http://localhost/api/alerts", { method: "GET" })
    );
    expect(res.status).toBe(200);
  });

  it("refuses demo credentials in production", () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      expect(authenticateOperator("OCC-ADMIN", "admin123").success).toBe(false);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prev;
    }
  });
});
