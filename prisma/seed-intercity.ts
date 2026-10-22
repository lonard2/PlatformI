/**
 * PlatformI - Versioned Intercity Seed Ingester (v1)
 *
 * Gateway-first replacement dataset for intercity timetables. Slice v1 seeds
 * one rail gateway (Stasiun Gambir) plus a minimal operator set; later slices
 * append gateways and modes by extending INTERCITY_OPERATORS / INTERCITY_RUNS.
 *
 * Guarantees:
 * - Validation fails loudly (HH:mm times, required origin/destination/operator).
 * - Idempotent upserts by stable natural keys (operator code, trip code, stop code).
 * - Replaces stale intercity rows while leaving city rows (operatorId null) intact.
 *
 * Ordering: invoke AFTER the city tables are seeded (see prisma/seed.ts) so the
 * referenced lines already exist; the ingester also upserts its lines defensively.
 */

import { PrismaClient } from "@prisma/client";

import type { BoardingPointKind, TransitMode } from "../src/types/transit";
import { JABODETABEK_REGION, TRANSIT_LINES } from "../src/lib/data/jakarta-dataset";

export const INTERCITY_SEED_VERSION = 1;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface IntercitySeedBoardingPoint {
  code: string;
  label: string;
  kind: BoardingPointKind;
}

export interface IntercitySeedOperator {
  code: string;
  name: string;
  mode: TransitMode;
  serviceTier: string;
  boardingPoints: IntercitySeedBoardingPoint[];
}

export interface IntercitySeedRow {
  tripCode: string;
  lineCode: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  operatorCode: string;
  serviceClass?: string;
  gateOrBay?: string;
  daysOfWeek?: number[];
  boardingPointCodes?: string[];
}

export interface SeedIntercityResult {
  operators: number;
  runs: number;
}

/** Slice v1: Gambir rail gateway, KAI intercity operator set. */
export const INTERCITY_OPERATORS: IntercitySeedOperator[] = [
  {
    code: "KAI",
    name: "PT Kereta Api Indonesia (Persero)",
    // TransitMode explicitly covers KAI_INTERCITY (see src/types/transit.ts).
    mode: "KAI_INTERCITY",
    serviceTier: "INTERCITY_RAIL",
    boardingPoints: [
      { code: "GMR-GATE-A", label: "Gerbang A (Jalur 1-2)", kind: "GATE" },
      { code: "GMR-GATE-B", label: "Gerbang B (Jalur 3-4)", kind: "GATE" },
    ],
  },
];

/** Slice v1 timetable rows departing the Gambir rail gateway. */
export const INTERCITY_RUNS: IntercitySeedRow[] = [
  {
    tripCode: "KA-101",
    lineCode: "KAI",
    origin: "Stasiun Gambir (GMR)",
    destination: "Surabaya Pasarturi (SBI)",
    departureTime: "08:20",
    arrivalTime: "16:30",
    operatorCode: "KAI",
    serviceClass: "Eksekutif Argo Bromo Anggrek",
    gateOrBay: "Jalur 3 (Peron 2)",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["GMR-GATE-A"],
  },
  {
    tripCode: "KA-13",
    lineCode: "KAI",
    origin: "Stasiun Gambir (GMR)",
    destination: "Solo Balapan (SLO)",
    departureTime: "20:30",
    arrivalTime: "03:36",
    operatorCode: "KAI",
    serviceClass: "Eksekutif Argo Lawu",
    gateOrBay: "Jalur 1 (Peron 1)",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["GMR-GATE-B"],
  },
  {
    tripCode: "KA-55",
    lineCode: "KAI",
    origin: "Stasiun Gambir (GMR)",
    destination: "Malang (ML)",
    departureTime: "18:10",
    arrivalTime: "06:05",
    operatorCode: "KAI",
    serviceClass: "Eksekutif Gajayana",
    gateOrBay: "Jalur 2 (Peron 1)",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["GMR-GATE-A", "GMR-GATE-B"],
  },
];

export function operatorRecordId(operatorCode: string): string {
  return `op-${operatorCode.toLowerCase()}`;
}

export function boardingPointRecordId(operatorCode: string, pointCode: string): string {
  return `bp-${operatorCode.toLowerCase()}-${pointCode.toLowerCase()}`;
}

export function runRecordId(tripCode: string): string {
  return `run-${tripCode.toLowerCase()}`;
}

/**
 * Validate one hand-authored timetable row. Throws naming the trip code so a
 * bad HH:mm time or missing field fails loudly instead of silently skipping.
 */
export function validateIntercitySeedRow(row: IntercitySeedRow): void {
  const missing: string[] = [];
  if (!row.origin) missing.push("origin");
  if (!row.destination) missing.push("destination");
  if (!row.operatorCode) missing.push("operator");
  if (missing.length > 0) {
    throw new Error(`Invalid timetable row ${row.tripCode}: missing required ${missing.join(", ")}`);
  }
  const times: Array<[string, string]> = [
    ["departureTime", row.departureTime],
    ["arrivalTime", row.arrivalTime],
  ];
  for (const [field, value] of times) {
    if (!HH_MM_PATTERN.test(value)) {
      throw new Error(
        `Invalid timetable row ${row.tripCode}: ${field} "${value}" must use HH:mm format`,
      );
    }
  }
  const operator = INTERCITY_OPERATORS.find((candidate) => candidate.code === row.operatorCode);
  if (operator) {
    const valid = new Set(operator.boardingPoints.map((p) => p.code));
    for (const code of row.boardingPointCodes ?? []) {
      if (!valid.has(code)) {
        throw new Error(
          `Invalid timetable row ${row.tripCode}: unknown boarding point "${code}" for operator "${operator.code}"`,
        );
      }
    }
  }
}

export async function seedIntercity(externalClient?: PrismaClient): Promise<SeedIntercityResult> {
  const client = externalClient ?? new PrismaClient();
  try {
    for (const row of INTERCITY_RUNS) {
      validateIntercitySeedRow(row);
    }

    const operatorByCode = new Map(INTERCITY_OPERATORS.map((op) => [op.code, op]));
    for (const row of INTERCITY_RUNS) {
      if (!operatorByCode.has(row.operatorCode)) {
        throw new Error(`Invalid timetable row ${row.tripCode}: unknown operator "${row.operatorCode}"`);
      }
    }

    // Ensure region and referenced lines exist (city seed normally provides them).
    await client.region.upsert({
      where: { code: JABODETABEK_REGION.code },
      update: {},
      create: {
        id: JABODETABEK_REGION.id,
        code: JABODETABEK_REGION.code,
        name: JABODETABEK_REGION.name,
        centerLatitude: JABODETABEK_REGION.centerLatitude,
        centerLongitude: JABODETABEK_REGION.centerLongitude,
        zoomLevel: JABODETABEK_REGION.zoomLevel,
        boundaryCoordinatesJson: JSON.stringify(JABODETABEK_REGION.boundaryCoordinates),
      },
    });

    const lineCodes = [...new Set(INTERCITY_RUNS.map((row) => row.lineCode))];
    for (const lineCode of lineCodes) {
      const line = TRANSIT_LINES.find((candidate) => candidate.code === lineCode);
      if (!line) {
        throw new Error(`Intercity seed references unknown line code "${lineCode}"`);
      }
      await client.line.upsert({
        where: { code: line.code },
        update: {},
        create: {
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

    for (const operator of INTERCITY_OPERATORS) {
      const operatorId = operatorRecordId(operator.code);
      await client.intercityOperator.upsert({
        where: { id: operatorId },
        update: { name: operator.name, mode: operator.mode, serviceTier: operator.serviceTier },
        create: {
          id: operatorId,
          name: operator.name,
          mode: operator.mode,
          serviceTier: operator.serviceTier,
        },
      });

      const wantedPointIds = operator.boardingPoints.map((point) =>
        boardingPointRecordId(operator.code, point.code),
      );
      for (const point of operator.boardingPoints) {
        const pointId = boardingPointRecordId(operator.code, point.code);
        await client.boardingPoint.upsert({
          where: { id: pointId },
          update: { label: point.label, kind: point.kind },
          create: { id: pointId, operatorId, label: point.label, kind: point.kind },
        });
      }
      await client.boardingPoint.deleteMany({
        where: { operatorId, id: { notIn: wantedPointIds } },
      });
    }

    const seedTripCodes = INTERCITY_RUNS.map((row) => row.tripCode);
    for (const row of INTERCITY_RUNS) {
      const operator = operatorByCode.get(row.operatorCode);
      if (!operator) continue;
      const operatorId = operatorRecordId(operator.code);
      const line = TRANSIT_LINES.find((candidate) => candidate.code === row.lineCode);
      if (!line) continue;
      const valid = new Set(operator.boardingPoints.map((p) => p.code));
      for (const code of row.boardingPointCodes ?? []) {
        if (!valid.has(code)) {
          throw new Error(
            `Invalid timetable row ${row.tripCode}: unknown boarding point "${code}" for operator "${operator.code}"`,
          );
        }
      }
      const boardingPointIds = (row.boardingPointCodes ?? []).map((code) =>
        boardingPointRecordId(operator.code, code),
      );
      await client.timetableRun.upsert({
        where: { id: runRecordId(row.tripCode) },
        update: {
          lineId: line.id,
          origin: row.origin,
          destination: row.destination,
          departureTime: row.departureTime,
          arrivalTime: row.arrivalTime,
          operatorName: operator.name,
          operatorId,
          // Serialize boarding-point ids at the Prisma boundary (daysOfWeek precedent).
          boardingPointIdsJson: JSON.stringify(boardingPointIds),
          serviceClass: row.serviceClass,
          gateOrBay: row.gateOrBay,
          daysOfWeekJson: JSON.stringify(row.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0]),
        },
        create: {
          id: runRecordId(row.tripCode),
          lineId: line.id,
          tripCode: row.tripCode,
          origin: row.origin,
          destination: row.destination,
          departureTime: row.departureTime,
          arrivalTime: row.arrivalTime,
          operatorName: operator.name,
          operatorId,
          boardingPointIdsJson: JSON.stringify(boardingPointIds),
          serviceClass: row.serviceClass,
          gateOrBay: row.gateOrBay,
          daysOfWeekJson: JSON.stringify(row.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0]),
        },
      });
    }

    // Replace stale intercity rows; city rows (operatorId null) are untouched.
    await client.timetableRun.deleteMany({
      where: { operatorId: { not: null }, tripCode: { notIn: seedTripCodes } },
    });

    return { operators: INTERCITY_OPERATORS.length, runs: INTERCITY_RUNS.length };
  } finally {
    if (!externalClient) {
      await client.$disconnect();
    }
  }
}
