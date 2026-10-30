/**
 * RED: region CRUD — regions are authorable via a dedicated API (validated
 * boundary polygon, delete blocked while lines reference it unless forced)
 * instead of a hardcoded single region.
 */
import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  OPERATOR_COOKIE_NAME,
  createOperatorSessionToken,
} from "@/lib/services/adminAuthService";

const OPS_COOKIE = `${OPERATOR_COOKIE_NAME}=${encodeURIComponent(createOperatorSessionToken("OCC-TEST-OPS", "CHIEF_DISPATCHER"))}`;

function authed(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: { ...init?.headers, cookie: OPS_COOKIE },
  });
}
import { GET, POST, PUT, DELETE } from "@/app/api/network/regions/route";

const URL = "http://localhost:3000/api/network/regions";

function req(method: string, query = "", body?: unknown): NextRequest {
  return authed(`${URL}${query}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("region CRUD", () => {
  const createdRegionIds: string[] = [];
  const createdLineIds: string[] = [];

  afterEach(async () => {
    const { DELETE: deleteLine } = await import("@/app/api/network/lines/route");
    for (const id of createdLineIds.splice(0)) {
      await deleteLine(
        authed(`http://localhost:3000/api/network/lines?id=${id}`, { method: "DELETE" })
      );
    }
    for (const id of createdRegionIds.splice(0)) {
      await DELETE(req("DELETE", `?id=${id}&force=true`));
    }
  });

  it("lists the seeded region with its line count", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const regions = (body.data || []) as Array<Record<string, unknown>>;
    const jakarta = regions.find((r) => r.code === "JABODETABEK");
    expect(jakarta).toBeDefined();
    expect(jakarta?.name).toBeDefined();
    expect(Number(jakarta?.lineCount)).toBeGreaterThan(0);
  });

  it("rejects creation without required fields or with a bad boundary", async () => {
    const missing = await POST(req("POST", "", { code: "TST" }));
    expect(missing.status).toBe(400);
    const bad = await POST(
      req("POST", "", {
        code: "TST",
        name: "Test Region",
        centerLatitude: -6.2,
        centerLongitude: 106.8,
        boundaryCoordinatesJson: "not-json",
      })
    );
    expect(bad.status).toBe(400);
  });

  it("creates, renames, and deletes an empty region", async () => {
    const post = await POST(
      req("POST", "", {
        code: "TST-RG",
        name: "Test Region",
        centerLatitude: -6.2,
        centerLongitude: 106.8,
        zoomLevel: 11,
        boundaryCoordinatesJson: JSON.stringify([
          { latitude: -6.1, longitude: 106.7 },
          { latitude: -6.1, longitude: 106.9 },
          { latitude: -6.3, longitude: 106.9 },
        ]),
      })
    );
    expect(post.status).toBe(201);
    const created = (await post.json()).data as Record<string, unknown>;
    createdRegionIds.push(created.id as string);
    expect(created.name).toBe("Test Region");

    const put = await PUT(req("PUT", "", { id: created.id, name: "Test Region Renamed" }));
    expect(put.status).toBe(200);
    expect(((await put.json()).data as Record<string, unknown>).name).toBe("Test Region Renamed");

    const del = await DELETE(req("DELETE", `?id=${created.id}`));
    expect(del.status).toBe(200);
    createdRegionIds.pop();
  });

  it("blocks deleting a region that still has lines, unless forced", async () => {
    const jakarta = "reg-jabodetabek-01";
    const blocked = await DELETE(req("DELETE", `?id=${jakarta}`));
    expect(blocked.status).toBe(409);
    expect(Number((await blocked.json()).lineCount)).toBeGreaterThan(0);

    const post = await POST(
      req("POST", "", { code: "TST-F", name: "Force Region", centerLatitude: 0, centerLongitude: 0 })
    );
    const region = (await post.json()).data as Record<string, unknown>;
    createdRegionIds.push(region.id as string);

    const { POST: postLine } = await import("@/app/api/network/lines/route");
    const lineRes = await postLine(
      authed("http://localhost:3000/api/network/lines", {
        method: "POST",
        body: JSON.stringify({
          code: "TST-FL",
          name: "Force Test Line",
          category: "BUS",
          mode: "TRANSJAKARTA_BRT",
          colorHex: "#123456",
          regionId: region.id,
        }),
      })
    );
    expect(lineRes.status).toBe(201);
    const line = (await lineRes.json()).data as Record<string, unknown>;
    createdLineIds.push(line.id as string);

    const forced = await DELETE(req("DELETE", `?id=${region.id}&force=true`));
    expect(forced.status).toBe(200);
    createdRegionIds.pop();
    createdLineIds.pop();
  });
});
