/**
 * RED: vehicle extended identity round-trips — run/trainset/formation/depot/
 * fleet/plate/operator plus photos survive POST then GET (and PUT then GET)
 * instead of being dropped by the persistence layer.
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
import { POST, PUT, GET, DELETE } from "@/app/api/fleet/vehicles/route";

const LINE_ID = "line-mrt-ns";

function req(method: string, body?: unknown, query = ""): NextRequest {
  return authed(`http://localhost:3000/api/fleet/vehicles${query}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const EXTENDED = {
  runNumber: "R-101",
  trainsetNumber: "TS-07",
  totalTrainsets: 16,
  carFormation: "6-car (4M2T)",
  depotHome: "Lebak Bulus Depot",
  fleetNumber: "MRT-07",
  busRunNumber: "BRT-14-A",
  licensePlate: "B 7007 PQ",
  operatorName: "PT MRT Jakarta",
};

const PHOTOS = [
  {
    id: "photo-rt-1",
    url: "https://example.com/fleet/mrt-07.jpg",
    caption: "MRT-07 at Lebak Bulus",
    photographer: "OCC",
    tag: "exterior",
  },
];

describe("fleet extended identity round-trip", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    // The suite shares dev.db with the dataset-audit test, which asserts
    // exact seeded counts: remove every vehicle this file creates.
    for (const id of createdIds.splice(0)) {
      await DELETE(
        authed(`http://localhost:3000/api/fleet/vehicles?id=${id}`, {
          method: "DELETE",
        })
      );
    }
  });

  it("POST persists extended identity and photos through GET", async () => {
    const code = `RT-${Date.now().toString(36).toUpperCase()}`;
    const post = await POST(
      req("POST", {
        vehicleCode: code,
        name: "Roundtrip Test Unit",
        lineId: LINE_ID,
        ...EXTENDED,
        photos: PHOTOS,
      })
    );
    expect(post.status).toBe(201);
    const created = (await post.json()).data as Record<string, unknown>;
    const vid = created.id as string;
    createdIds.push(vid);

    const get = await GET(req("GET", undefined, `?lineId=${LINE_ID}`));
    const list = ((await get.json()).data || []) as Array<Record<string, unknown>>;
    const found = list.find((v) => v.id === vid);
    expect(found).toBeDefined();
    for (const [k, v] of Object.entries(EXTENDED)) {
      expect(found?.[k]).toBe(v);
    }
    expect(found?.photos).toMatchObject([
      { url: PHOTOS[0].url, caption: PHOTOS[0].caption },
    ]);
  });

  it("PUT updates extended identity and photos", async () => {
    const code = `RU-${Date.now().toString(36).toUpperCase()}`;
    const post = await POST(
      req("POST", { vehicleCode: code, name: "Update Test Unit", lineId: LINE_ID })
    );
    const vid = ((await post.json()).data as Record<string, unknown>).id as string;
    createdIds.push(vid);

    const put = await PUT(
      req("PUT", {
        id: vid,
        runNumber: "R-202",
        licensePlate: "B 2024 XY",
        photos: [{ ...PHOTOS[0], id: "photo-rt-2", url: "https://example.com/fleet/x.jpg" }],
      })
    );
    expect(put.status).toBe(200);

    const get = await GET(req("GET", undefined, `?lineId=${LINE_ID}`));
    const list = ((await get.json()).data || []) as Array<Record<string, unknown>>;
    const found = list.find((v) => v.id === vid);
    expect(found?.runNumber).toBe("R-202");
    expect(found?.licensePlate).toBe("B 2024 XY");
    expect(found?.photos).toMatchObject([{ url: "https://example.com/fleet/x.jpg" }]);
  });
});
