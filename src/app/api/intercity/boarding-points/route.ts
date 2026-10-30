/**
 * PlatformI - Intercity Boarding Points API
 *
 * OCC authoring for operator boarding points (terminal, agen, pool, gate,
 * pier) so pool and gate rosters no longer require a code and reseed cycle.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BoardingPoint, BoardingPointKind } from "@/types/transit";
import { requireOperator } from "@/lib/services/adminAuthService";
import { paginate, readPageParams } from "@/lib/api/pagination";

const BOARDING_POINT_KINDS: BoardingPointKind[] = ["TERMINAL", "AGEN", "POOL", "GATE", "PIER"];

function toView(row: {
  id: string;
  operatorId: string;
  label: string;
  kind: string;
}): BoardingPoint {
  return {
    id: row.id,
    operatorId: row.operatorId,
    label: row.label,
    kind: row.kind as BoardingPointKind,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get("operatorId");

    const rows = await db.boardingPoint.findMany({
      where: { ...(operatorId ? { operatorId } : {}) },
      orderBy: { label: "asc" },
    });

    const pointPage = paginate(
      rows.map(toView),
      readPageParams(request.url)
    );
    return NextResponse.json({
      success: true,
      data: pointPage.items,
      page: pointPage.page,
      pageSize: pointPage.pageSize,
      total: pointPage.total,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve boarding points",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"), request.headers);
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { operatorId, label, kind } = body;

    if (!operatorId || !label || !kind) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: operatorId, label, kind" },
        { status: 400 },
      );
    }
    if (!BOARDING_POINT_KINDS.includes(kind as BoardingPointKind)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid kind '${kind}'. Must be one of ${BOARDING_POINT_KINDS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const operator = await db.intercityOperator.findUnique({
      where: { id: String(operatorId) },
    });
    if (!operator) {
      return NextResponse.json(
        { success: false, error: `Intercity operator '${operatorId}' not found` },
        { status: 404 },
      );
    }

    const created = await db.boardingPoint.create({
      data: {
        id:
          body.id ||
          `bp-${String(operatorId).toLowerCase().replace(/[^a-z0-9]+/g, "")}-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
        operatorId: String(operatorId),
        label: String(label).trim(),
        kind: String(kind),
      },
    });

    return NextResponse.json({ success: true, data: toView(created) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create boarding point",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"), request.headers);
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: id" },
        { status: 400 },
      );
    }
    if (body.kind !== undefined && !BOARDING_POINT_KINDS.includes(body.kind as BoardingPointKind)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid kind '${body.kind}'. Must be one of ${BOARDING_POINT_KINDS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const existing = await db.boardingPoint.findUnique({ where: { id: String(id) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Boarding point '${id}' not found` },
        { status: 404 },
      );
    }

    const updated = await db.boardingPoint.update({
      where: { id: String(id) },
      data: {
        ...(body.label !== undefined ? { label: String(body.label).trim() } : {}),
        ...(body.kind !== undefined ? { kind: String(body.kind) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: toView(updated) });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update boarding point",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"), request.headers);
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: id" },
        { status: 400 },
      );
    }

    const existing = await db.boardingPoint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Boarding point '${id}' not found` },
        { status: 404 },
      );
    }

    await db.boardingPoint.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      message: `Boarding point '${existing.label}' deleted`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete boarding point",
      },
      { status: 500 },
    );
  }
}
