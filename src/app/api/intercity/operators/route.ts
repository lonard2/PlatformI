/**
 * PlatformI - Intercity Operators API
 *
 * Lists intercity operators (rail, bus, shuttle, aviation, maritime)
 * seeded by the versioned intercity ingester, plus OCC authoring
 * (create / rename / delete) so operator rosters no longer require
 * a code and reseed cycle.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { IntercityOperator, TransitMode } from "@/types/transit";
import { requireOperator } from "@/lib/services/adminAuthService";
import { paginate, readPageParams } from "@/lib/api/pagination";

export async function GET(request?: Request): Promise<NextResponse> {
  try {
    const rows = await db.intercityOperator.findMany({
      orderBy: { name: "asc" },
    });

    const operators: IntercityOperator[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      mode: row.mode as TransitMode,
      serviceTier: row.serviceTier,
    }));

    const operatorPage = paginate(operators, readPageParams(request?.url ?? "http://localhost/"));
    return NextResponse.json({
      operators: operatorPage.items,
      page: operatorPage.page,
      pageSize: operatorPage.pageSize,
      total: operatorPage.total,
    });
  } catch (error) {
    return NextResponse.json(
      {
        operators: [],
        error: error instanceof Error ? error.message : "Failed to retrieve intercity operators",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"));
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { name, mode, serviceTier } = body;

    if (!name || !mode || !serviceTier) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, mode, serviceTier" },
        { status: 400 },
      );
    }

    const created = await db.intercityOperator.create({
      data: {
        id: body.id || `op-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
        name: String(name).trim(),
        mode: String(mode),
        serviceTier: String(serviceTier).trim(),
      },
    });

    const operator: IntercityOperator = {
      id: created.id,
      name: created.name,
      mode: created.mode as TransitMode,
      serviceTier: created.serviceTier,
    };
    return NextResponse.json({ success: true, data: operator }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create intercity operator",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"));
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

    const existing = await db.intercityOperator.findUnique({ where: { id: String(id) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Intercity operator '${id}' not found` },
        { status: 404 },
      );
    }

    const updated = await db.intercityOperator.update({
      where: { id: String(id) },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.mode !== undefined ? { mode: String(body.mode) } : {}),
        ...(body.serviceTier !== undefined ? { serviceTier: String(body.serviceTier).trim() } : {}),
      },
    });

    const operator: IntercityOperator = {
      id: updated.id,
      name: updated.name,
      mode: updated.mode as TransitMode,
      serviceTier: updated.serviceTier,
    };
    return NextResponse.json({ success: true, data: operator });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update intercity operator",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const operator = requireOperator(request.headers.get("cookie"));
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

    const existing = await db.intercityOperator.findUnique({
      where: { id },
      include: { _count: { select: { boardingPoints: true, timetableRuns: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Intercity operator '${id}' not found` },
        { status: 404 },
      );
    }

    // Boarding points cascade; linked runs keep their schedule with a
    // nulled operator reference, so the delete reports both counts.
    await db.intercityOperator.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      deletedBoardingPoints: existing._count.boardingPoints,
      detachedRuns: existing._count.timetableRuns,
      message: `Intercity operator '${existing.name}' deleted`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete intercity operator",
      },
      { status: 500 },
    );
  }
}
