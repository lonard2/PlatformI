/**
 * PlatformI - Prisma SQLite Database Seeder
 * Populates real Jabodetabek transit lines, stations, enthusiast vehicles,
 * technical specs, photo galleries, disruption alerts, and demo tickets.
 */

import { PrismaClient } from "@prisma/client";
import {
  JABODETABEK_REGION,
  TRANSIT_LINES,
  TRANSIT_STOPS,
  TRANSIT_VEHICLES,
  VEHICLE_TECHNICAL_SPECS,
  DISRUPTION_ALERTS,
} from "../src/lib/data/jakarta-dataset";

const prisma = new PrismaClient();

async function main() {
  console.log("[PlatformI Seeder] Starting database population...");

  // 1. Clean existing records in reverse dependency order
  await prisma.crowdsourceCheckIn.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.disruptionAlert.deleteMany();
  await prisma.photoGallery.deleteMany();
  await prisma.technicalSpec.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.line.deleteMany();
  await prisma.region.deleteMany();

  console.log("[PlatformI Seeder] Cleaned existing database tables.");

  // 2. Insert Region
  const createdRegion = await prisma.region.create({
    data: {
      id: JABODETABEK_REGION.id,
      code: JABODETABEK_REGION.code,
      name: JABODETABEK_REGION.name,
      centerLatitude: JABODETABEK_REGION.centerLatitude,
      centerLongitude: JABODETABEK_REGION.centerLongitude,
      zoomLevel: JABODETABEK_REGION.zoomLevel,
      boundaryCoordinatesJson: JSON.stringify(JABODETABEK_REGION.boundaryCoordinates),
    },
  });
  console.log(`[PlatformI Seeder] Inserted Region: ${createdRegion.name} (${createdRegion.code})`);

  // 3. Insert Lines
  for (const line of TRANSIT_LINES) {
    await prisma.line.create({
      data: {
        id: line.id,
        regionId: line.regionId,
        code: line.code,
        name: line.name,
        category: line.category,
        mode: line.mode,
        colorHex: line.colorHex,
        textColorHex: line.textColorHex,
        fareType: line.fareType,
        baseFareRp: line.baseFareRp,
        farePerKmRp: line.farePerKmRp,
        maxFareRp: line.maxFareRp,
        headwayMinutes: line.headwayMinutes,
        firstDeparture: line.firstDeparture,
        lastDeparture: line.lastDeparture,
        polylineCoordinatesJson: JSON.stringify(line.polylineCoordinates),
      },
    });
  }
  console.log(`[PlatformI Seeder] Inserted ${TRANSIT_LINES.length} Transit Lines.`);

  // 4. Insert Stops
  for (const stop of TRANSIT_STOPS) {
    await prisma.stop.create({
      data: {
        id: stop.id,
        lineId: stop.lineId,
        name: stop.name,
        code: stop.code,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequence: stop.sequence,
        isInterchange: stop.isInterchange,
        connectedLineIdsJson: JSON.stringify(stop.connectedLineIds),
        facilitiesJson: JSON.stringify(stop.facilities),
        accessibleElevator: stop.accessibleElevator,
        tactilePaving: stop.tactilePaving,
        wheelchairRamp: stop.wheelchairRamp,
        platformType: stop.platformType,
      },
    });
  }
  console.log(`[PlatformI Seeder] Inserted ${TRANSIT_STOPS.length} Stops/Stations.`);

  // 5. Insert Vehicles, Seating Diagrams, Technical Specs, and Photos
  for (const vehicle of TRANSIT_VEHICLES) {
    await prisma.vehicle.create({
      data: {
        id: vehicle.id,
        lineId: vehicle.lineId,
        vehicleCode: vehicle.vehicleCode,
        name: vehicle.name,
        category: vehicle.category,
        mode: vehicle.mode,
        currentLatitude: vehicle.currentLatitude,
        currentLongitude: vehicle.currentLongitude,
        headingDegrees: vehicle.headingDegrees,
        speedKmh: vehicle.speedKmh,
        status: vehicle.status,
        crowdLevel: vehicle.crowdLevel,
        acComfort: vehicle.acComfort,
        coachbuilder: vehicle.coachbuilder,
        chassis: vehicle.chassis,
        progressFraction: vehicle.progressFraction,
        currentSegmentIndex: vehicle.currentSegmentIndex,
        nextStopId: vehicle.nextStopId,
        nextStopEtaSeconds: vehicle.nextStopEtaSeconds,
        seatingDiagramJson: vehicle.seatingDiagram ? JSON.stringify(vehicle.seatingDiagram) : null,
      },
    });

    // Add Photos
    if (vehicle.photos && vehicle.photos.length > 0) {
      for (const photo of vehicle.photos) {
        await prisma.photoGallery.create({
          data: {
            id: photo.id,
            vehicleId: vehicle.id,
            url: photo.url,
            caption: photo.caption,
            photographer: photo.photographer,
            tag: photo.tag,
          },
        });
      }
    }
  }
  console.log(`[PlatformI Seeder] Inserted ${TRANSIT_VEHICLES.length} Vehicles with Seating & Photos.`);

  // 6. Insert Technical Specs
  for (const spec of VEHICLE_TECHNICAL_SPECS) {
    await prisma.technicalSpec.create({
      data: {
        id: spec.id,
        vehicleId: spec.vehicleId,
        coachbuilder: spec.coachbuilder,
        chassisModel: spec.chassisModel,
        powertrain: spec.powertrain,
        engineOutput: spec.engineOutput,
        torque: spec.torque,
        transmission: spec.transmission,
        suspensionType: spec.suspensionType,
        lengthMeters: spec.lengthMeters,
        passengerCapacity: spec.passengerCapacity,
        maxSpeedKmh: spec.maxSpeedKmh,
        safetyFeaturesJson: JSON.stringify(spec.safetyFeatures),
        historicalNotes: spec.historicalNotes,
      },
    });
  }
  console.log(`[PlatformI Seeder] Inserted ${VEHICLE_TECHNICAL_SPECS.length} Enthusiast Technical Specifications.`);

  // 7. Insert Disruption Alerts
  for (const alert of DISRUPTION_ALERTS) {
    await prisma.disruptionAlert.create({
      data: {
        id: alert.id,
        lineId: alert.lineId,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        affectedStopsJson: JSON.stringify(alert.affectedStops),
        startTime: new Date(alert.startTime),
      },
    });
  }
  console.log(`[PlatformI Seeder] Inserted ${DISRUPTION_ALERTS.length} Disruption Alerts.`);

  // 8. Insert Demo Initial Tickets (JakLingko 3-hour Capped Pass)
  await prisma.ticket.create({
    data: {
      id: "tkt-demo-jaklingko-01",
      ticketNumber: "PLTI-JKT-20260822-001",
      userId: "usr-commuter-jakarta",
      originStopId: "stop-mrt-lbk",
      destinationStopId: "stop-mrt-bhi",
      legsJson: JSON.stringify([
        {
          legIndex: 0,
          lineId: "line-mrt-ns",
          originStopId: "stop-mrt-lbk",
          destinationStopId: "stop-mrt-asn",
          mode: "MRT_JAKARTA",
          fareRp: 7000,
          distanceKm: 8.5,
        },
        {
          legIndex: 1,
          lineId: "line-tj-cor-13",
          originStopId: "stop-mrt-asn",
          destinationStopId: "stop-mrt-dka",
          mode: "TRANSJAKARTA_BRT",
          fareRp: 3500,
          distanceKm: 5.2,
        },
      ]),
      totalFareRp: 10000,
      isJakLingkoCapped: true,
      status: "ACTIVE",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 180 * 60 * 1000), // 3 hours window
      rollingToken: "PLTI:tkt-demo-jaklingko-01:12345:a8f9e0b1c2d3e4f5",
    },
  });

  // 9. Insert Initial Commuter Crowdsource Check-ins
  await prisma.crowdsourceCheckIn.create({
    data: {
      id: "chk-demo-01",
      vehicleId: "veh-mrt-ts01",
      userId: "usr-commuter-jakarta",
      crowdLevel: "LEVEL_2_FEW_SEATS",
      acComfort: "OPTIMAL",
      note: "Smooth ride, air conditioning cold and seats available in car 3.",
      timestamp: new Date(),
    },
  });

  console.log("[PlatformI Seeder] Successfully finished database population!");
}

main()
  .catch((e) => {
    console.error("[PlatformI Seeder] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
