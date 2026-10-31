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

import type { PrismaClient } from "@prisma/client";

import type { BoardingPointKind, TransitMode } from "../src/types/transit";
import { JABODETABEK_REGION, TRANSIT_LINES } from "../src/lib/data/jakarta-dataset";
import { db } from "../src/lib/db";

export const INTERCITY_SEED_VERSION = 4;

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
  /** Representative class fare in rupiah (public timetables move; marked representative). */
  fareRp: number;
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
      { code: "PSN-GATE-A", label: "Gerbang A Pasar Senen", kind: "GATE" },
    ],
  },
  /** Slice v2: AKAP bus operators on the shared Jakarta corridor line. */
  {
    code: "SJ",
    name: "PT Sinar Jaya Megah Langgeng",
    mode: "AKAP_INTERCITY_BUS",
    serviceTier: "INTERCITY_BUS",
    boardingPoints: [
      { code: "SJ-PGB-BAY", label: "Pulo Gebang Bay 1-4", kind: "TERMINAL" },
      { code: "SJ-KPR-BAY", label: "Kampung Rambutan Bay 2", kind: "TERMINAL" },
    ],
  },
  /** Slice v2: Pelni sea corridor on the Tanjung Priok line. */
  {
    code: "PELNI",
    name: "PT Pelayaran Nasional Indonesia (Persero)",
    mode: "MARITIME_PELNI",
    serviceTier: "INTERCITY_SEA",
    boardingPoints: [
      { code: "TPK-DERMAGA", label: "Dermaga Terminal Penumpang Nusantara", kind: "TERMINAL" },
    ],
  },
  /** Slice v2: Thousand Islands speedboats, operator-set daily banks. */
  {
    code: "SERIBU",
    name: "Kepulauan Seribu Speedboat Pool",
    mode: "MARITIME_SPEEDBOAT",
    serviceTier: "INTERCITY_SEA",
    boardingPoints: [
      { code: "MRA-KALI-ADEM", label: "Dermaga Kali Adem Muara Angke", kind: "POOL" },
      { code: "ANC-MARINA", label: "Dermaga Marina Ancol", kind: "POOL" },
    ],
  },
  /** Slice v4: Jakarta-Bandung executive shuttle pools. */
  {
    code: "DAYTRANS",
    name: "PT DayTrans Global Travel",
    mode: "EXECUTIVE_SHUTTLE",
    serviceTier: "EXECUTIVE_SHUTTLE",
    boardingPoints: [
      { code: "FX-SDR", label: "Pool FX Sudirman (Pintu 1 Senayan)", kind: "POOL" },
      { code: "DIP-BDG", label: "Pool Dipatiukur Bandung", kind: "POOL" },
    ],
  },
  {
    code: "CITITRANS",
    name: "PT Cititrans Bus Indonesia",
    mode: "EXECUTIVE_SHUTTLE",
    serviceTier: "EXECUTIVE_SHUTTLE",
    boardingPoints: [
      { code: "CT-RS", label: "Pool HR Rasuna Said", kind: "POOL" },
      { code: "CT-PST", label: "Pool Pasteur Bandung", kind: "POOL" },
    ],
  },
  {
    code: "BARAYA",
    name: "PT Baraya Travel",
    mode: "EXECUTIVE_SHUTTLE",
    serviceTier: "EXECUTIVE_SHUTTLE",
    boardingPoints: [
      { code: "BR-SRN", label: "Pool Sarinah", kind: "POOL" },
      { code: "BR-SMG", label: "Pool Semanggi", kind: "POOL" },
      { code: "BR-PST", label: "Pool Pasteur Bandung", kind: "POOL" },
      { code: "BR-ANT", label: "Pool Antapani Bandung", kind: "POOL" },
    ],
  },
  /** Slice v4: domestic airlines on the CGK trunk corridors. */
  {
    code: "GA",
    name: "Garuda Indonesia",
    mode: "AIRPORT_COMMERCIAL",
    serviceTier: "FULL_SERVICE_AIR",
    boardingPoints: [
      { code: "CGK-T3", label: "Terminal 3 Ultimate", kind: "TERMINAL" },
      { code: "HLP", label: "Halim Perdanakusuma", kind: "TERMINAL" },
    ],
  },
  {
    code: "QG",
    name: "Citilink",
    mode: "AIRPORT_COMMERCIAL",
    serviceTier: "LOW_COST_AIR",
    boardingPoints: [
      { code: "CGK-T1", label: "Terminal 1", kind: "TERMINAL" },
      { code: "CGK-T3", label: "Terminal 3 Ultimate", kind: "TERMINAL" },
    ],
  },
  {
    code: "JT",
    name: "Lion Air",
    mode: "AIRPORT_COMMERCIAL",
    serviceTier: "LOW_COST_AIR",
    boardingPoints: [
      { code: "CGK-T1", label: "Terminal 1", kind: "TERMINAL" },
      { code: "CGK-T2", label: "Terminal 2", kind: "TERMINAL" },
    ],
  },
];

/** Slice v1 timetable rows departing the Gambir rail gateway. */
export const INTERCITY_RUNS: IntercitySeedRow[] = [
  {
    tripCode: "KA-101",
    fareRp: 800000,
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
    fareRp: 550000,
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
    fareRp: 600000,
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
  // Slice v2: representative corridor banks (public Gapeka timetables move;
  // times here are stable daily banks, not live departures).
  {
    tripCode: "KA-201",
    fareRp: 150000,
    lineCode: "KAI",
    origin: "Stasiun Gambir (GMR)",
    destination: "Stasiun Bandung (BD)",
    departureTime: "06:30",
    arrivalTime: "09:35",
    operatorCode: "KAI",
    serviceClass: "Eksekutif Parahyangan",
    gateOrBay: "Jalur 1 (Peron 1)",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["GMR-GATE-A"],
  },
  {
    tripCode: "KA-202",
    fareRp: 500000,
    lineCode: "KAI",
    origin: "Stasiun Gambir (GMR)",
    destination: "Stasiun Yogyakarta (YK)",
    departureTime: "08:00",
    arrivalTime: "15:20",
    operatorCode: "KAI",
    serviceClass: "Eksekutif Taksaka",
    gateOrBay: "Jalur 3 (Peron 2)",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["GMR-GATE-B"],
  },
  {
    tripCode: "KA-304",
    fareRp: 300000,
    lineCode: "KAI",
    origin: "Stasiun Pasar Senen (PSN)",
    destination: "Stasiun Surabaya Pasarturi (SBI)",
    departureTime: "13:00",
    arrivalTime: "23:40",
    operatorCode: "KAI",
    serviceClass: "Ekonomi Jayabaya",
    gateOrBay: "Gerbang A",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["PSN-GATE-A"],
  },
  {
    tripCode: "SJ-101",
    fareRp: 180000,
    lineCode: "AKAP-JKT",
    origin: "Terminal Terpadu Pulo Gebang",
    destination: "Terminal Cicaheum Bandung",
    departureTime: "07:00",
    arrivalTime: "10:30",
    operatorCode: "SJ",
    serviceClass: "Eksekutif 28 Seat",
    gateOrBay: "Bay 1-4",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["SJ-PGB-BAY"],
  },
  {
    tripCode: "SJ-102",
    fareRp: 320000,
    lineCode: "AKAP-JKT",
    origin: "Terminal Terpadu Pulo Gebang",
    destination: "Terminal Giwangan Yogyakarta",
    departureTime: "19:00",
    arrivalTime: "03:30",
    operatorCode: "SJ",
    serviceClass: "Eksekutif 28 Seat",
    gateOrBay: "Bay 1-4",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["SJ-PGB-BAY"],
  },
  {
    tripCode: "SJ-103",
    fareRp: 450000,
    lineCode: "AKAP-JKT",
    origin: "Terminal Kampung Rambutan",
    destination: "Terminal Purabaya Surabaya",
    departureTime: "16:00",
    arrivalTime: "04:30",
    operatorCode: "SJ",
    serviceClass: "Sleeper Suite",
    gateOrBay: "Bay 2",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["SJ-KPR-BAY"],
  },
  {
    tripCode: "PEL-01",
    fareRp: 400000,
    lineCode: "PELNI",
    origin: "Pelabuhan Tanjung Priok",
    destination: "Pelabuhan Belawan Medan",
    departureTime: "14:00",
    arrivalTime: "08:00",
    operatorCode: "PELNI",
    serviceClass: "Ekonomi KM Kelud",
    gateOrBay: "Dermaga Terminal Penumpang Nusantara",
    daysOfWeek: [3],
    boardingPointCodes: ["TPK-DERMAGA"],
  },
  {
    tripCode: "SRB-01",
    fareRp: 175000,
    lineCode: "SBD",
    origin: "Pelabuhan Muara Angke (Dermaga Kali Adem)",
    destination: "Pulau Tidung",
    departureTime: "07:30",
    arrivalTime: "09:00",
    operatorCode: "SERIBU",
    serviceClass: "Speedboat Reguler",
    gateOrBay: "Dermaga Kali Adem",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["MRA-KALI-ADEM"],
  },
  {
    tripCode: "SRB-02",
    fareRp: 200000,
    lineCode: "SBD",
    origin: "Pelabuhan Marina Ancol",
    destination: "Pulau Pramuka",
    departureTime: "08:00",
    arrivalTime: "09:30",
    operatorCode: "SERIBU",
    serviceClass: "Speedboat Reguler",
    gateOrBay: "Marina Ancol",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["ANC-MARINA"],
  },
  // Slice v4: Jakarta-Bandung shuttle pool-to-pool (representative banks).
  {
    tripCode: "DT-01",
    fareRp: 150000,
    lineCode: "SHUTTLE",
    origin: "Pool DayTrans FX Sudirman",
    destination: "Pool DayTrans Dipatiukur Bandung",
    departureTime: "06:00",
    arrivalTime: "08:45",
    operatorCode: "DAYTRANS",
    serviceClass: "HiAce Premio 14 Seat",
    gateOrBay: "Pintu 1 Senayan",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["FX-SDR", "DIP-BDG"],
  },
  {
    tripCode: "CT-01",
    fareRp: 145000,
    lineCode: "SHUTTLE-CT",
    origin: "Pool Cititrans HR Rasuna Said",
    destination: "Pool Cititrans Pasteur Bandung",
    departureTime: "07:00",
    arrivalTime: "09:40",
    operatorCode: "CITITRANS",
    serviceClass: "Executive 16 Seat",
    gateOrBay: "Rasuna Said",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["CT-RS", "CT-PST"],
  },
  {
    tripCode: "BR-01",
    fareRp: 130000,
    lineCode: "SHUTTLE-BR",
    origin: "Pool Baraya Sarinah",
    destination: "Pool Baraya Antapani Bandung",
    departureTime: "06:30",
    arrivalTime: "09:30",
    operatorCode: "BARAYA",
    serviceClass: "Executive 14 Seat",
    gateOrBay: "Sarinah",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["BR-SRN", "BR-ANT"],
  },
  {
    tripCode: "BR-02",
    fareRp: 130000,
    lineCode: "SHUTTLE-BR",
    origin: "Pool Baraya Semanggi",
    destination: "Pool Baraya Pasteur Bandung",
    departureTime: "15:00",
    arrivalTime: "18:00",
    operatorCode: "BARAYA",
    serviceClass: "Executive 14 Seat",
    gateOrBay: "Semanggi",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["BR-SMG", "BR-PST"],
  },
  // Slice v4: domestic air trunk corridors (representative schedule banks).
  {
    tripCode: "GA-401",
    fareRp: 1250000,
    lineCode: "CGK-DPS",
    origin: "Bandara Soekarno-Hatta (CGK)",
    destination: "Bandara I Gusti Ngurah Rai Denpasar (DPS)",
    departureTime: "07:00",
    arrivalTime: "09:55",
    operatorCode: "GA",
    serviceClass: "Ekonomi",
    gateOrBay: "Terminal 3",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["CGK-T3"],
  },
  {
    tripCode: "QG-601",
    fareRp: 850000,
    lineCode: "CGK-SUB",
    origin: "Bandara Soekarno-Hatta (CGK)",
    destination: "Bandara Juanda Surabaya (SUB)",
    departureTime: "08:15",
    arrivalTime: "09:45",
    operatorCode: "QG",
    serviceClass: "Ekonomi",
    gateOrBay: "Terminal 1",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["CGK-T1"],
  },
  {
    tripCode: "JT-701",
    fareRp: 1450000,
    lineCode: "CGK-KNO",
    origin: "Bandara Soekarno-Hatta (CGK)",
    destination: "Bandara Kualanamu Medan (KNO)",
    departureTime: "09:30",
    arrivalTime: "11:55",
    operatorCode: "JT",
    serviceClass: "Ekonomi",
    gateOrBay: "Terminal 1",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["CGK-T1"],
  },
  {
    tripCode: "GA-801",
    fareRp: 1650000,
    lineCode: "CGK-UPG",
    origin: "Bandara Soekarno-Hatta (CGK)",
    destination: "Bandara Sultan Hasanuddin Makassar (UPG)",
    departureTime: "10:00",
    arrivalTime: "13:10",
    operatorCode: "GA",
    serviceClass: "Ekonomi",
    gateOrBay: "Terminal 3",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    boardingPointCodes: ["CGK-T3"],
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
  if (!Number.isInteger(row.fareRp) || row.fareRp <= 0) {
    throw new Error(
      `Invalid timetable row ${row.tripCode}: fareRp must be a positive integer`,
    );
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
  const client = externalClient ?? db;
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
          fareRp: row.fareRp,
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
          fareRp: row.fareRp,
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
