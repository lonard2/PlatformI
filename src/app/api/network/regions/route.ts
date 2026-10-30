/**
 * PlatformI - Network Regions REST API
 *
 * OCC authoring for service regions (code, name, center, zoom, boundary
 * polygon). Deletes are blocked while lines reference the region unless
 * ?force=true cascades them, with counts reported either way.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Coordinate, Region } from "@/types/transit";
import { requireOperator } from "@/lib/services/adminAuthService";

function parseBoundary(raw: unknown): { ok: true; points: Coordinate[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, points: [] };
  }
  let parsed: unknown;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: "boundaryCoordinatesJson must be valid JSON" };
  }
  if (!Array.isArray(parsed) || parsed.length < 3) {
    return { ok: false, error: "boundaryCoordinatesJson must be an array of at least 3 coordinates" };
  }
  const points: Coordinate[] = [];
  for (const p of parsed) {
    if (
      typeof p !== "object" ||
      p === null ||
      !Number.isFinite((p as { latitude?: unknown }).latitude) ||
      !Number.isFinite((p as { longitude?: unknown }).longitude)
    ) {
      return { ok: false, error: "Each boundary point must have numeric latitude and longitude" };
    }
    const { latitude, longitude } = p as { latitude: number; longitude: number };
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return { ok: false, error: "Boundary coordinates out of range" };
    }
    points.push({ latitude, longitude });
  }
  return { ok: true, points };
}

type RegionRow = {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  centerLatitude: number;
  centerLongitude: number;
  zoomLevel: number;
  boundaryCoordinatesJson: string;
  _count?: { lines: number };
};

function toView(row: RegionRow, lineCount: number): Region & { lineCount: number } {
  let boundary: Coordinate[] = [];
  try {
    boundary = JSON.parse(row.boundaryCoordinatesJson || "[]") as Coordinate[];
  } catch {
    boundary = [];
  }
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    countryCode: row.countryCode,
    centerLatitude: row.centerLatitude,
    centerLongitude: row.centerLongitude,
    zoomLevel: row.zoomLevel,
    boundaryCoordinates: boundary,
    lineCount,
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db.region.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { lines: true } } },
    });
    return NextResponse.json({ success: true, data: rows.map((r) => toView(r, r._count.lines)) });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve regions",
      },
      { status: 500 }
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
    const { code, name, centerLatitude, centerLongitude } = body;
    if (!code || !name || centerLatitude === undefined || centerLongitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: code, name, centerLatitude, centerLongitude",
        },
        { status: 400 }
      );
    }
    const boundary = parseBoundary(body.boundaryCoordinatesJson);
    if (!boundary.ok) {
      return NextResponse.json({ success: false, error: boundary.error }, { status: 400 });
    }

    const created = await db.region.create({
      data: {
        id:
          body.id ||
          `reg-${String(code).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        code: String(code).trim(),
        name: String(name).trim(),
        countryCode: body.countryCode ? String(body.countryCode).trim().toUpperCase() : "ID",
        centerLatitude: Number(centerLatitude),
        centerLongitude: Number(centerLongitude),
        zoomLevel: body.zoomLevel !== undefined ? Number(body.zoomLevel) : 12,
        boundaryCoordinatesJson: JSON.stringify(boundary.points),
      },
      include: { _count: { select: { lines: true } } },
    });
    return NextResponse.json({ success: true, data: toView(created, created._count.lines) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create region",
      },
      { status: 500 }
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
        { status: 400 }
      );
    }
    if (body.boundaryCoordinatesJson !== undefined) {
      const boundary = parseBoundary(body.boundaryCoordinatesJson);
      if (!boundary.ok) {
        return NextResponse.json({ success: false, error: boundary.error }, { status: 400 });
      }
    }

    const existing = await db.region.findUnique({ where: { id: String(id) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Region '${id}' not found` },
        { status: 404 }
      );
    }

    const updated = await db.region.update({
      where: { id: String(id) },
      data: {
        ...(body.code !== undefined ? { code: String(body.code).trim() } : {}),
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.countryCode !== undefined
          ? { countryCode: String(body.countryCode).trim().toUpperCase() }
          : {}),
        ...(body.centerLatitude !== undefined ? { centerLatitude: Number(body.centerLatitude) } : {}),
        ...(body.centerLongitude !== undefined ? { centerLongitude: Number(body.centerLongitude) } : {}),
        ...(body.zoomLevel !== undefined ? { zoomLevel: Number(body.zoomLevel) } : {}),
        ...(body.boundaryCoordinatesJson !== undefined
          ? {
              boundaryCoordinatesJson: JSON.stringify(
                (parseBoundary(body.boundaryCoordinatesJson) as { ok: true; points: Coordinate[] }).points
              ),
            }
          : {}),
      },
      include: { _count: { select: { lines: true } } },
    });
    return NextResponse.json({ success: true, data: toView(updated, updated._count.lines) });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update region",
      },
      { status: 500 }
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
    const force = searchParams.get("force") === "true";
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    const existing = await db.region.findUnique({
      where: { id },
      include: { _count: { select: { lines: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Region '${id}' not found` },
        { status: 404 }
      );
    }

    // Lines cascade on delete; without an explicit force flag a referenced
    // region is never wiped by accident.
    if (existing._count.lines > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: `Region '${existing.code}' still has ${existing._count.lines} line(s). Pass force=true to delete them.`,
          lineCount: existing._count.lines,
        },
        { status: 409 }
      );
    }

    await db.region.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      deletedLines: existing._count.lines,
      message: `Region '${existing.code}' deleted`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete region",
      },
      { status: 500 }
    );
  }
}
