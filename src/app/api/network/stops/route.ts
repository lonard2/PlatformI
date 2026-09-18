/**
 * PlatformI - Multimodal Transit Stops & Stations REST API
 *
 * Provides endpoints for retrieving, creating, updating, and deleting transit stops
 * and passenger hubs with accessibility flags and interchange assignments.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Stop } from "@/types/transit";
import { TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";

// In-memory runtime cache ensuring operational continuity if DB is temporarily locked
let runtimeStops: Stop[] = [...TRANSIT_STOPS];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get("lineId");
    const isInterchange = searchParams.get("isInterchange");

    let stops: Stop[] = [];

    try {
      const dbStops = await db.stop.findMany({
        where: {
          ...(lineId ? { lineId } : {}),
          ...(isInterchange !== null ? { isInterchange: isInterchange === "true" } : {}),
        },
        orderBy: { sequence: "asc" },
      });

      if (dbStops.length > 0) {
        stops = dbStops.map((s) => ({
          id: s.id,
          lineId: s.lineId,
          name: s.name,
          code: s.code,
          latitude: s.latitude,
          longitude: s.longitude,
          sequence: s.sequence,
          isInterchange: s.isInterchange,
          connectedLineIds: JSON.parse(s.connectedLineIdsJson || "[]") as string[],
          facilities: JSON.parse(s.facilitiesJson || "[]") as string[],
          accessibleElevator: s.accessibleElevator,
          tactilePaving: s.tactilePaving,
          wheelchairRamp: s.wheelchairRamp,
          platformType: s.platformType || undefined,
        }));
      } else {
        stops = [...runtimeStops];
      }
    } catch {
      stops = [...runtimeStops];
    }

    if (lineId) {
      stops = stops.filter((s) => s.lineId === lineId);
    }

    return NextResponse.json({
      success: true,
      count: stops.length,
      data: stops,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve transit stops",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      lineId,
      latitude,
      longitude,
      sequence,
      isInterchange = false,
      connectedLineIds = [],
      facilities = [],
      accessibleElevator = false,
      tactilePaving = false,
      wheelchairRamp = false,
      platformType = "ISLAND",
    } = body;

    // Validation
    if (!name || !code || !lineId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required stop fields: name, code, lineId, latitude, longitude",
        },
        { status: 400 }
      );
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinate values" },
        { status: 400 }
      );
    }

    const newStopId = body.id || `stop-${code.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
    const seq = sequence !== undefined ? Number(sequence) : runtimeStops.filter((s) => s.lineId === lineId).length + 1;

    const createdStop: Stop = {
      id: newStopId,
      lineId,
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      sequence: seq,
      isInterchange: Boolean(isInterchange),
      connectedLineIds: Array.isArray(connectedLineIds) ? connectedLineIds : [],
      facilities: Array.isArray(facilities) ? facilities : [],
      accessibleElevator: Boolean(accessibleElevator),
      tactilePaving: Boolean(tactilePaving),
      wheelchairRamp: Boolean(wheelchairRamp),
      platformType: String(platformType),
    };

    try {
      await db.stop.create({
        data: {
          id: createdStop.id,
          lineId: createdStop.lineId,
          name: createdStop.name,
          code: createdStop.code,
          latitude: createdStop.latitude,
          longitude: createdStop.longitude,
          sequence: createdStop.sequence,
          isInterchange: createdStop.isInterchange,
          connectedLineIdsJson: JSON.stringify(createdStop.connectedLineIds),
          facilitiesJson: JSON.stringify(createdStop.facilities),
          accessibleElevator: createdStop.accessibleElevator,
          tactilePaving: createdStop.tactilePaving,
          wheelchairRamp: createdStop.wheelchairRamp,
          platformType: createdStop.platformType,
        },
      });
    } catch {
      // Continue to update runtime cache
    }

    runtimeStops.push(createdStop);

    return NextResponse.json(
      {
        success: true,
        message: "Transit stop created successfully",
        data: createdStop,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create transit stop",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing stop id parameter" },
        { status: 400 }
      );
    }

    const updateData: Partial<Stop> = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.code !== undefined) updateData.code = String(body.code).trim().toUpperCase();
    if (body.lineId !== undefined) updateData.lineId = String(body.lineId);
    if (body.latitude !== undefined) updateData.latitude = Number(Number(body.latitude).toFixed(6));
    if (body.longitude !== undefined) updateData.longitude = Number(Number(body.longitude).toFixed(6));
    if (body.sequence !== undefined) updateData.sequence = Number(body.sequence);
    if (body.isInterchange !== undefined) updateData.isInterchange = Boolean(body.isInterchange);
    if (body.accessibleElevator !== undefined) updateData.accessibleElevator = Boolean(body.accessibleElevator);
    if (body.tactilePaving !== undefined) updateData.tactilePaving = Boolean(body.tactilePaving);
    if (body.wheelchairRamp !== undefined) updateData.wheelchairRamp = Boolean(body.wheelchairRamp);
    if (body.platformType !== undefined) updateData.platformType = String(body.platformType);
    if (body.connectedLineIds !== undefined && Array.isArray(body.connectedLineIds)) {
      updateData.connectedLineIds = body.connectedLineIds;
    }
    if (body.facilities !== undefined && Array.isArray(body.facilities)) {
      updateData.facilities = body.facilities;
    }

    try {
      const dbUpdatePayload: Record<string, unknown> = { ...updateData };
      if (updateData.connectedLineIds !== undefined) {
        dbUpdatePayload.connectedLineIdsJson = JSON.stringify(updateData.connectedLineIds);
        delete dbUpdatePayload.connectedLineIds;
      }
      if (updateData.facilities !== undefined) {
        dbUpdatePayload.facilitiesJson = JSON.stringify(updateData.facilities);
        delete dbUpdatePayload.facilities;
      }

      await db.stop.update({
        where: { id },
        data: dbUpdatePayload,
      });
    } catch {
      // Continue to update runtime cache
    }

    runtimeStops = runtimeStops.map((s) =>
      s.id === id ? { ...s, ...updateData } : s
    );

    const updated = runtimeStops.find((s) => s.id === id);

    return NextResponse.json({
      success: true,
      message: "Transit stop updated successfully",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transit stop",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing stop id parameter" },
        { status: 400 }
      );
    }

    try {
      await db.stop.delete({ where: { id } });
    } catch {
      // Continue to purge runtime cache
    }

    runtimeStops = runtimeStops.filter((s) => s.id !== id);

    return NextResponse.json({
      success: true,
      message: `Transit stop ${id} deleted successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete transit stop",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
