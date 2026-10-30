/**
 * RED: list endpoints paginate. Explicit page params slice the payload
 * with page metadata; pageSize is capped; without params boards get the
 * full list exactly as before.
 */
import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as alertsGet } from "@/app/api/alerts/route";
import { GET as fleetGet } from "@/app/api/fleet/vehicles/route";
import { GET as linesGet } from "@/app/api/network/lines/route";
import { GET as stopsGet } from "@/app/api/network/stops/route";
import { GET as regionsGet } from "@/app/api/network/regions/route";
import { GET as timetablesGet } from "@/app/api/network/timetables/route";
import { GET as operatorsGet } from "@/app/api/intercity/operators/route";
import { GET as pointsGet } from "@/app/api/intercity/boarding-points/route";
import { paginate, readPageParams, MAX_PAGE_SIZE } from "@/lib/api/pagination";
import { db } from "@/lib/db";

type Handler = (req: NextRequest) => Promise<Response>;

const SURFACES: Array<[string, Handler, string]> = [
  ["alerts", alertsGet, "http://localhost/api/alerts"],
  ["fleet", fleetGet, "http://localhost/api/fleet/vehicles"],
  ["lines", linesGet, "http://localhost/api/network/lines"],
  ["stops", stopsGet, "http://localhost/api/network/stops"],
  ["regions", regionsGet, "http://localhost/api/network/regions"],
  ["timetables", timetablesGet, "http://localhost/api/network/timetables"],
  ["operators", operatorsGet, "http://localhost/api/intercity/operators"],
  ["boarding-points", pointsGet, "http://localhost/api/intercity/boarding-points"],
];

async function getJson(handler: Handler, url: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await handler(new NextRequest(url, { method: "GET" }));
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

function payloadList(json: Record<string, unknown>): unknown[] {
  const list = json["data"] ?? json["operators"];
  return Array.isArray(list) ? list : [];
}

describe("list pagination", () => {
  it("clamps pageSize and floors page at 1", () => {
    expect(readPageParams("http://x/?page=0&pageSize=9999")).toEqual({ page: 1, pageSize: MAX_PAGE_SIZE });
    expect(readPageParams("http://x/?page=abc")).toEqual({ page: 1, pageSize: 50 });
    expect(readPageParams("http://x/")).toEqual({ page: 1, pageSize: null });
  });

  it("slices in-memory lists with metadata", () => {
    const out = paginate([1, 2, 3], { page: 2, pageSize: 2 });
    expect(out).toEqual({ items: [3], page: 2, pageSize: 2, total: 3 });
    const all = paginate([1, 2], { page: 1, pageSize: null });
    expect(all.items).toEqual([1, 2]);
    expect(all.total).toBe(2);
  });

  it("exposes page metadata on every surface", async () => {
    for (const [name, handler, url] of SURFACES) {
      const { status, json } = await getJson(handler, `${url}?page=1&pageSize=1`);
      expect(status, name).toBe(200);
      expect(typeof json["page"], name).toBe("number");
      expect(typeof json["pageSize"], name).toBe("number");
      expect(typeof json["total"], name).toBe("number");
      expect(Array.isArray(json["data"] ?? json["operators"]), name).toBe(true);
      expect(payloadList(json).length, name).toBeLessThanOrEqual(1);
      expect(json["pageSize"] as number, name).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    }
  });

  it("preserves full lists when no page params are given", async () => {
    for (const [name, handler, url] of SURFACES) {
      const { status, json } = await getJson(handler, url);
      expect(status, name).toBe(200);
      expect(payloadList(json).length, name).toBe(json["total"] ?? payloadList(json).length);
    }
  });

  it("paginates seeded operators across pages", async () => {
    const tag = Date.now() % 1000000;
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const row = await db.intercityOperator.create({
        data: { name: `PAG-OP-${tag}-${i}`, mode: "AKAP", serviceTier: "EXECUTIVE" },
      });
      ids.push(row.id);
    }
    try {
      const first = await getJson(operatorsGet, "http://localhost/api/intercity/operators?page=1&pageSize=2");
      const second = await getJson(operatorsGet, "http://localhost/api/intercity/operators?page=2&pageSize=2");
      expect(payloadList(first.json).length).toBe(2);
      expect(payloadList(second.json).length).toBeGreaterThanOrEqual(1);
      expect(first.json["total"]).toBe(second.json["total"]);
      const firstIds = (payloadList(first.json) as Array<{ id: string }>).map((r) => r.id);
      const secondIds = (payloadList(second.json) as Array<{ id: string }>).map((r) => r.id);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    } finally {
      await db.intercityOperator.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }
  });
});
