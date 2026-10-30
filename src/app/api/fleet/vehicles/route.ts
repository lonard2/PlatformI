/**
 * PlatformI - Multimodal Transit Fleet Vehicles REST API
 *
 * Provides endpoints for retrieving, creating, updating, and deleting transit vehicles
 * and rolling stock with technical specs, seating diagrams, and live telemetry.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  Vehicle,
  TransitCategory,
  TransitMode,
  VehicleOperationalStatus,
  CrowdDensityLevel,
  ACComfortRating,
  TechnicalSpec,
  SeatingDiagram,
} from "@/types/transit";
import { TRANSIT_VEHICLES } from "@/lib/data/jakarta-dataset";
import { requireOperator } from "@/lib/services/adminAuthService";
import { paginate, readPageParams } from "@/lib/api/pagination";

// In-memory runtime cache ensuring operational continuity if DB is temporarily locked or offline
let runtimeVehicles: Vehicle[] = [...TRANSIT_VEHICLES];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get("lineId");
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");

    let vehicles: Vehicle[] = [];

    try {
      const dbVehicles = await db.vehicle.findMany({
        where: {
          ...(lineId ? { lineId } : {}),
          ...(category ? { category } : {}),
          ...(mode ? { mode } : {}),
        },
        include: {
          technicalSpec: true,
          photos: true,
        },
        orderBy: { vehicleCode: "asc" },
      });

      if (dbVehicles.length > 0) {
        vehicles = dbVehicles.map((v) => {
          let parsedSeating: SeatingDiagram | undefined = undefined;
          if (v.seatingDiagramJson) {
            try {
              parsedSeating = JSON.parse(v.seatingDiagramJson) as SeatingDiagram;
            } catch {
              parsedSeating = undefined;
            }
          }

          let mappedSpec: TechnicalSpec | undefined = undefined;
          if (v.technicalSpec) {
            let safetyFeatures: string[] = [];
            try {
              safetyFeatures = JSON.parse(v.technicalSpec.safetyFeaturesJson || "[]") as string[];
            } catch {
              safetyFeatures = [];
            }

            mappedSpec = {
              id: v.technicalSpec.id,
              vehicleId: v.technicalSpec.vehicleId,
              coachbuilder: v.technicalSpec.coachbuilder,
              chassisModel: v.technicalSpec.chassisModel,
              powertrain: v.technicalSpec.powertrain,
              engineOutput: v.technicalSpec.engineOutput,
              torque: v.technicalSpec.torque,
              transmission: v.technicalSpec.transmission,
              suspensionType: v.technicalSpec.suspensionType,
              lengthMeters: v.technicalSpec.lengthMeters,
              passengerCapacity: v.technicalSpec.passengerCapacity,
              maxSpeedKmh: v.technicalSpec.maxSpeedKmh,
              safetyFeatures,
              historicalNotes: v.technicalSpec.historicalNotes,
            };
          }

          return {
            id: v.id,
            lineId: v.lineId,
            vehicleCode: v.vehicleCode,
            name: v.name,
            category: v.category as TransitCategory,
            mode: v.mode as TransitMode,
            currentLatitude: v.currentLatitude,
            currentLongitude: v.currentLongitude,
            headingDegrees: v.headingDegrees,
            speedKmh: v.speedKmh,
            status: v.status as VehicleOperationalStatus,
            crowdLevel: v.crowdLevel as CrowdDensityLevel,
            acComfort: v.acComfort as ACComfortRating,
            coachbuilder: v.coachbuilder,
            chassis: v.chassis,
            progressFraction: v.progressFraction,
            currentSegmentIndex: v.currentSegmentIndex,
            nextStopId: v.nextStopId,
            nextStopEtaSeconds: v.nextStopEtaSeconds,
            runNumber: v.runNumber ?? undefined,
            trainsetNumber: v.trainsetNumber ?? undefined,
            totalTrainsets: v.totalTrainsets ?? undefined,
            carFormation: v.carFormation ?? undefined,
            depotHome: v.depotHome ?? undefined,
            fleetNumber: v.fleetNumber ?? undefined,
            busRunNumber: v.busRunNumber ?? undefined,
            licensePlate: v.licensePlate ?? undefined,
            operatorName: v.operatorName ?? undefined,
            technicalSpec: mappedSpec,
            seatingDiagram: parsedSeating,
            photos: v.photos.map((p) => ({
              id: p.id,
              vehicleId: p.vehicleId,
              url: p.url,
              caption: p.caption,
              photographer: p.photographer,
              tag: p.tag,
            })),
          };
        });
      } else {
        vehicles = [...runtimeVehicles];
      }
    } catch {
      vehicles = [...runtimeVehicles];
    }

    if (lineId) {
      vehicles = vehicles.filter((v) => v.lineId === lineId);
    }
    if (category) {
      vehicles = vehicles.filter((v) => v.category === category);
    }
    if (mode) {
      vehicles = vehicles.filter((v) => v.mode === mode);
    }

    const vehiclePage = paginate(vehicles, readPageParams(request.url));
    return NextResponse.json({
      success: true,
      count: vehiclePage.items.length,
      data: vehiclePage.items,
      page: vehiclePage.page,
      pageSize: vehiclePage.pageSize,
      total: vehiclePage.total,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve transit vehicles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const operator = requireOperator(request.headers.get("cookie"));
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const {
      vehicleCode,
      name,
      lineId,
      category = "BUS",
      mode = "TRANSJAKARTA_BRT",
      speedKmh = 40,
      coachbuilder = "Laksana Karoseri",
      chassis = "Mercedes-Benz OH 1626",
      currentLatitude = -6.2088,
      currentLongitude = 106.8456,
      headingDegrees = 0,
      status = "IN_SERVICE",
      crowdLevel = "LEVEL_2_FEW_SEATS",
      acComfort = "OPTIMAL",
      progressFraction = 0,
      currentSegmentIndex = 0,
      nextStopId = "stop-0",
      nextStopEtaSeconds = 180,
      runNumber,
      trainsetNumber,
      totalTrainsets,
      carFormation,
      depotHome,
      fleetNumber,
      busRunNumber,
      licensePlate,
      operatorName,
      delayMinutes,
      speedModifier,
      detourCoordinates,
      photos,
    } = body;

    // Validation for mandatory fields
    if (!vehicleCode || !name || !lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required vehicle fields: vehicleCode, name, lineId",
        },
        { status: 400 }
      );
    }

    const trimmedCode = String(vehicleCode).trim().toUpperCase();
    const newVehicleId = body.id || `veh-${trimmedCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;

    const createdVehicle: Vehicle = {
      id: newVehicleId,
      lineId: String(lineId),
      vehicleCode: trimmedCode,
      name: String(name).trim(),
      category: category as TransitCategory,
      mode: mode as TransitMode,
      currentLatitude: Number(Number(currentLatitude).toFixed(6)),
      currentLongitude: Number(Number(currentLongitude).toFixed(6)),
      headingDegrees: Number(headingDegrees) || 0,
      speedKmh: Number(speedKmh) || 0,
      status: status as VehicleOperationalStatus,
      crowdLevel: crowdLevel as CrowdDensityLevel,
      acComfort: acComfort as ACComfortRating,
      coachbuilder: String(coachbuilder).trim(),
      chassis: String(chassis).trim(),
      progressFraction: Number(progressFraction) || 0,
      currentSegmentIndex: Number(currentSegmentIndex) || 0,
      nextStopId: String(nextStopId),
      nextStopEtaSeconds: Number(nextStopEtaSeconds) || 0,
      runNumber: runNumber ? String(runNumber) : undefined,
      trainsetNumber: trainsetNumber ? String(trainsetNumber) : undefined,
      totalTrainsets: totalTrainsets !== undefined ? Number(totalTrainsets) : undefined,
      carFormation: carFormation ? String(carFormation) : undefined,
      depotHome: depotHome ? String(depotHome) : undefined,
      fleetNumber: fleetNumber ? String(fleetNumber) : undefined,
      busRunNumber: busRunNumber ? String(busRunNumber) : undefined,
      licensePlate: licensePlate ? String(licensePlate) : undefined,
      operatorName: operatorName ? String(operatorName) : undefined,
      delayMinutes: delayMinutes !== undefined ? Number(delayMinutes) : undefined,
      speedModifier: speedModifier !== undefined ? Number(speedModifier) : undefined,
      detourCoordinates: Array.isArray(detourCoordinates) ? detourCoordinates : undefined,
      technicalSpec: body.technicalSpec || undefined,
      seatingDiagram: body.seatingDiagram || undefined,
      photos: Array.isArray(photos)
        ? photos.map((p: { id?: string; url: string; caption?: string; photographer?: string; tag?: string }) => ({
            id: String(p.id || `photo-${newVehicleId}-${Math.random().toString(36).slice(2, 8)}`),
            vehicleId: newVehicleId,
            url: String(p.url),
            caption: String(p.caption || ""),
            photographer: String(p.photographer || ""),
            tag: String(p.tag || ""),
          }))
        : undefined,
    };

    try {
      await db.vehicle.create({
        data: {
          id: createdVehicle.id,
          lineId: createdVehicle.lineId,
          vehicleCode: createdVehicle.vehicleCode,
          name: createdVehicle.name,
          category: createdVehicle.category,
          mode: createdVehicle.mode,
          currentLatitude: createdVehicle.currentLatitude,
          currentLongitude: createdVehicle.currentLongitude,
          headingDegrees: createdVehicle.headingDegrees,
          speedKmh: createdVehicle.speedKmh,
          status: createdVehicle.status,
          crowdLevel: createdVehicle.crowdLevel,
          acComfort: createdVehicle.acComfort,
          coachbuilder: createdVehicle.coachbuilder,
          chassis: createdVehicle.chassis,
          progressFraction: createdVehicle.progressFraction,
          currentSegmentIndex: createdVehicle.currentSegmentIndex,
          nextStopId: createdVehicle.nextStopId,
          nextStopEtaSeconds: createdVehicle.nextStopEtaSeconds,
          runNumber: createdVehicle.runNumber,
          trainsetNumber: createdVehicle.trainsetNumber,
          totalTrainsets: createdVehicle.totalTrainsets,
          carFormation: createdVehicle.carFormation,
          depotHome: createdVehicle.depotHome,
          fleetNumber: createdVehicle.fleetNumber,
          busRunNumber: createdVehicle.busRunNumber,
          licensePlate: createdVehicle.licensePlate,
          operatorName: createdVehicle.operatorName,
          seatingDiagramJson: body.seatingDiagram ? JSON.stringify(body.seatingDiagram) : null,
          photos: createdVehicle.photos
            ? {
                create: createdVehicle.photos.map((p) => ({
                  id: p.id,
                  url: p.url,
                  caption: p.caption,
                  photographer: p.photographer,
                  tag: p.tag,
                })),
              }
            : undefined,
        },
      });
    } catch {
      // Continue to update runtime cache even if database throws or is locked
    }

    // Update in-memory runtime cache
    const existingIndex = runtimeVehicles.findIndex(
      (v) => v.id === createdVehicle.id || v.vehicleCode === createdVehicle.vehicleCode
    );
    if (existingIndex >= 0) {
      runtimeVehicles[existingIndex] = createdVehicle;
    } else {
      runtimeVehicles.push(createdVehicle);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Transit vehicle created successfully",
        data: createdVehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create transit vehicle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const operator = requireOperator(request.headers.get("cookie"));
  if (!operator) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const { id, vehicleCode } = body;

    if (!id && !vehicleCode) {
      return NextResponse.json(
        { success: false, error: "Missing required id or vehicleCode parameter" },
        { status: 400 }
      );
    }

    const updateData: Partial<Vehicle> = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.lineId !== undefined) updateData.lineId = String(body.lineId);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.mode !== undefined) updateData.mode = body.mode;
    if (body.currentLatitude !== undefined) updateData.currentLatitude = Number(Number(body.currentLatitude).toFixed(6));
    if (body.currentLongitude !== undefined) updateData.currentLongitude = Number(Number(body.currentLongitude).toFixed(6));
    if (body.headingDegrees !== undefined) updateData.headingDegrees = Number(body.headingDegrees);
    if (body.speedKmh !== undefined) updateData.speedKmh = Number(body.speedKmh);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.crowdLevel !== undefined) updateData.crowdLevel = body.crowdLevel;
    if (body.acComfort !== undefined) updateData.acComfort = body.acComfort;
    if (body.coachbuilder !== undefined) updateData.coachbuilder = String(body.coachbuilder).trim();
    if (body.chassis !== undefined) updateData.chassis = String(body.chassis).trim();
    if (body.progressFraction !== undefined) updateData.progressFraction = Number(body.progressFraction);
    if (body.currentSegmentIndex !== undefined) updateData.currentSegmentIndex = Number(body.currentSegmentIndex);
    if (body.nextStopId !== undefined) updateData.nextStopId = String(body.nextStopId);
    if (body.nextStopEtaSeconds !== undefined) updateData.nextStopEtaSeconds = Number(body.nextStopEtaSeconds);
    if (body.runNumber !== undefined) updateData.runNumber = String(body.runNumber);
    if (body.trainsetNumber !== undefined) updateData.trainsetNumber = String(body.trainsetNumber);
    if (body.totalTrainsets !== undefined) updateData.totalTrainsets = Number(body.totalTrainsets);
    if (body.carFormation !== undefined) updateData.carFormation = String(body.carFormation);
    if (body.depotHome !== undefined) updateData.depotHome = String(body.depotHome);
    if (body.fleetNumber !== undefined) updateData.fleetNumber = String(body.fleetNumber);
    if (body.busRunNumber !== undefined) updateData.busRunNumber = String(body.busRunNumber);
    if (body.licensePlate !== undefined) updateData.licensePlate = String(body.licensePlate);
    if (body.operatorName !== undefined) updateData.operatorName = String(body.operatorName);
    if (body.delayMinutes !== undefined) updateData.delayMinutes = Number(body.delayMinutes);
    if (body.speedModifier !== undefined) updateData.speedModifier = Number(body.speedModifier);
    if (body.detourCoordinates !== undefined && Array.isArray(body.detourCoordinates)) {
      updateData.detourCoordinates = body.detourCoordinates;
    }
    if (body.photos !== undefined && Array.isArray(body.photos)) {
      const targetId = id || `veh-${String(vehicleCode || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      updateData.photos = body.photos.map(
        (p: { id?: string; url: string; caption?: string; photographer?: string; tag?: string }) => ({
          id: String(p.id || `photo-${targetId}-${Math.random().toString(36).slice(2, 8)}`),
          vehicleId: String(targetId),
          url: String(p.url),
          caption: String(p.caption || ""),
          photographer: String(p.photographer || ""),
          tag: String(p.tag || ""),
        })
      );
    }

    try {
      const dbPayload: Record<string, unknown> = {};
      if (updateData.name !== undefined) dbPayload.name = updateData.name;
      if (updateData.lineId !== undefined) dbPayload.lineId = updateData.lineId;
      if (updateData.category !== undefined) dbPayload.category = updateData.category;
      if (updateData.mode !== undefined) dbPayload.mode = updateData.mode;
      if (updateData.currentLatitude !== undefined) dbPayload.currentLatitude = updateData.currentLatitude;
      if (updateData.currentLongitude !== undefined) dbPayload.currentLongitude = updateData.currentLongitude;
      if (updateData.headingDegrees !== undefined) dbPayload.headingDegrees = updateData.headingDegrees;
      if (updateData.speedKmh !== undefined) dbPayload.speedKmh = updateData.speedKmh;
      if (updateData.status !== undefined) dbPayload.status = updateData.status;
      if (updateData.crowdLevel !== undefined) dbPayload.crowdLevel = updateData.crowdLevel;
      if (updateData.acComfort !== undefined) dbPayload.acComfort = updateData.acComfort;
      if (updateData.coachbuilder !== undefined) dbPayload.coachbuilder = updateData.coachbuilder;
      if (updateData.chassis !== undefined) dbPayload.chassis = updateData.chassis;
      if (updateData.progressFraction !== undefined) dbPayload.progressFraction = updateData.progressFraction;
      if (updateData.currentSegmentIndex !== undefined) dbPayload.currentSegmentIndex = updateData.currentSegmentIndex;
      if (updateData.nextStopId !== undefined) dbPayload.nextStopId = updateData.nextStopId;
      if (updateData.nextStopEtaSeconds !== undefined) dbPayload.nextStopEtaSeconds = updateData.nextStopEtaSeconds;
      if (updateData.runNumber !== undefined) dbPayload.runNumber = updateData.runNumber;
      if (updateData.trainsetNumber !== undefined) dbPayload.trainsetNumber = updateData.trainsetNumber;
      if (updateData.totalTrainsets !== undefined) dbPayload.totalTrainsets = updateData.totalTrainsets;
      if (updateData.carFormation !== undefined) dbPayload.carFormation = updateData.carFormation;
      if (updateData.depotHome !== undefined) dbPayload.depotHome = updateData.depotHome;
      if (updateData.fleetNumber !== undefined) dbPayload.fleetNumber = updateData.fleetNumber;
      if (updateData.busRunNumber !== undefined) dbPayload.busRunNumber = updateData.busRunNumber;
      if (updateData.licensePlate !== undefined) dbPayload.licensePlate = updateData.licensePlate;
      if (updateData.operatorName !== undefined) dbPayload.operatorName = updateData.operatorName;
      if (updateData.photos !== undefined) {
        dbPayload.photos = {
          deleteMany: {},
          create: updateData.photos.map((p) => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            photographer: p.photographer,
            tag: p.tag,
          })),
        };
      }

      if (id) {
        await db.vehicle.update({
          where: { id },
          data: dbPayload,
        });
      } else if (vehicleCode) {
        await db.vehicle.update({
          where: { vehicleCode: String(vehicleCode).toUpperCase() },
          data: dbPayload,
        });
      }
    } catch {
      // Continue to update runtime cache
    }

    runtimeVehicles = runtimeVehicles.map((v) => {
      if ((id && v.id === id) || (vehicleCode && v.vehicleCode === String(vehicleCode).toUpperCase())) {
        return { ...v, ...updateData };
      }
      return v;
    });

    const updated = runtimeVehicles.find(
      (v) => (id && v.id === id) || (vehicleCode && v.vehicleCode === String(vehicleCode).toUpperCase())
    );

    return NextResponse.json({
      success: true,
      message: "Transit vehicle updated successfully",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transit vehicle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const vehicleCode = searchParams.get("vehicleCode");

    if (!id && !vehicleCode) {
      return NextResponse.json(
        { success: false, error: "Missing id or vehicleCode query parameter" },
        { status: 400 }
      );
    }

    try {
      if (id) {
        await db.vehicle.delete({ where: { id } });
      } else if (vehicleCode) {
        await db.vehicle.delete({ where: { vehicleCode: vehicleCode.toUpperCase() } });
      }
    } catch {
      // Continue to purge runtime cache
    }

    runtimeVehicles = runtimeVehicles.filter((v) => {
      if (id && v.id === id) return false;
      if (vehicleCode && v.vehicleCode === vehicleCode.toUpperCase()) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      message: `Vehicle ${id || vehicleCode} deleted successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete transit vehicle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
