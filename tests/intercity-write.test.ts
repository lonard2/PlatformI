/**
 * RED: intercity write APIs — operators and boarding points support
 * POST/PUT/DELETE instead of seed-frozen GET-only reads.
 */
import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as getOperators,
  POST as postOperator,
  PUT as putOperator,
  DELETE as deleteOperator,
} from "@/app/api/intercity/operators/route";
import {
  GET as getPoints,
  POST as postPoint,
  PUT as putPoint,
  DELETE as deletePoint,
} from "@/app/api/intercity/boarding-points/route";

function req(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const OPS = "http://localhost:3000/api/intercity/operators";
const BPS = "http://localhost:3000/api/intercity/boarding-points";

describe("intercity write APIs", () => {
  const opIds: string[] = [];
  const pointIds: string[] = [];

  afterEach(async () => {
    for (const id of pointIds.splice(0)) {
      await deletePoint(req(`${BPS}?id=${id}`, "DELETE"));
    }
    for (const id of opIds.splice(0)) {
      await deleteOperator(req(`${OPS}?id=${id}`, "DELETE"));
    }
  });

  it("creates, renames, and deletes an operator", async () => {
    const post = await postOperator(
      req(OPS, "POST", { name: "Test Shuttle Co", mode: "SHUTTLE", serviceTier: "Executive" })
    );
    expect(post.status).toBe(201);
    const created = (await post.json()).data as Record<string, unknown>;
    opIds.push(created.id as string);
    expect(created.name).toBe("Test Shuttle Co");

    const list = await getOperators();
    const ops = ((await list.json()).operators || []) as Array<Record<string, unknown>>;
    expect(ops.some((o) => o.id === created.id)).toBe(true);

    const put = await putOperator(
      req(OPS, "PUT", { id: created.id, name: "Test Shuttle Co Renamed" })
    );
    expect(put.status).toBe(200);
    expect(((await put.json()).data as Record<string, unknown>).name).toBe(
      "Test Shuttle Co Renamed"
    );

    const del = await deleteOperator(req(`${OPS}?id=${created.id}`, "DELETE"));
    expect(del.status).toBe(200);
    opIds.pop();
    const after = await getOperators();
    const afterOps = ((await after.json()).operators || []) as Array<Record<string, unknown>>;
    expect(afterOps.some((o) => o.id === created.id)).toBe(false);
  });

  it("rejects operator creation without required fields", async () => {
    const post = await postOperator(req(OPS, "POST", { name: "Incomplete" }));
    expect(post.status).toBe(400);
  });

  it("manages boarding points under an operator", async () => {
    const post = await postOperator(
      req(OPS, "POST", { name: "Point Owner Op", mode: "AKAP_BUS", serviceTier: "Eksekutif" })
    );
    const op = (await post.json()).data as Record<string, unknown>;
    opIds.push(op.id as string);

    const pp = await postPoint(
      req(BPS, "POST", { operatorId: op.id, label: "Pool Test Barat", kind: "POOL" })
    );
    expect(pp.status).toBe(201);
    const point = (await pp.json()).data as Record<string, unknown>;
    pointIds.push(point.id as string);

    const list = await getPoints(req(`${BPS}?operatorId=${op.id}`, "GET"));
    const points = ((await list.json()).data || []) as Array<Record<string, unknown>>;
    expect(points.some((p) => p.id === point.id && p.label === "Pool Test Barat")).toBe(true);

    const put = await putPoint(
      req(BPS, "PUT", { id: point.id, label: "Pool Test Barat Updated" })
    );
    expect(put.status).toBe(200);

    await deletePoint(req(`${BPS}?id=${point.id}`, "DELETE"));
    pointIds.pop();
    const after = await getPoints(req(`${BPS}?operatorId=${op.id}`, "GET"));
    expect(((await after.json()).data || []) as unknown[]).toHaveLength(0);
  });
});
