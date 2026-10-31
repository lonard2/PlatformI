/**
 * RED: shuttles + aviation expansion — Bandung shuttle pools (DayTrans,
 * Cititrans, Baraya) and CGK/HLP domestic air corridors with terminals,
 * operators, runs, and representative fares.
 */
import { describe, it, expect, afterEach } from "vitest";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { INTERCITY_OPERATORS, INTERCITY_RUNS } from "../prisma/seed-intercity";
import { db } from "@/lib/db";

describe("shuttle corridors", () => {
  it("covers the three Bandung shuttle operators", () => {
    const codes = INTERCITY_OPERATORS.map((o) => o.code);
    for (const must of ["DAYTRANS", "CITITRANS", "BARAYA"]) {
      expect(codes, must).toContain(must);
    }
    const shuttleOps = INTERCITY_OPERATORS.filter((o) => o.mode === "EXECUTIVE_SHUTTLE");
    expect(shuttleOps.length).toBeGreaterThanOrEqual(3);
  });

  it("names real Jakarta and Bandung pools", () => {
    const names = TRANSIT_STOPS.map((s) => s.name);
    for (const must of ["Dipatiukur", "Pasteur", "Semanggi", "Sarinah", "Antapani", "Rasuna Said"]) {
      expect(names.some((n) => n.includes(must)), must).toBe(true);
    }
  });

  it("runs pool-to-pool with representative fares", () => {
    const shuttleRuns = INTERCITY_RUNS.filter((r) =>
      ["DAYTRANS", "CITITRANS", "BARAYA"].includes(r.operatorCode)
    );
    expect(shuttleRuns.length).toBeGreaterThanOrEqual(3);
    for (const run of shuttleRuns) {
      expect(run.fareRp, run.tripCode).toBeGreaterThan(0);
      expect(run.origin.toLowerCase()).toMatch(/jakarta|sudirman|semanggi|sarinah|rasuna|fx/);
      expect(run.destination.toLowerCase()).toMatch(/bandung|dipatiukur|pasteur|antapani/);
    }
  });
});

describe("aviation corridors", () => {
  it("models CGK terminal 1/2/3 plus Halim", () => {
    const names = TRANSIT_STOPS.map((s) => s.name);
    expect(names.filter((n) => /Soekarno-Hatta/.test(n)).length).toBeGreaterThanOrEqual(3);
    expect(names.some((n) => /Halim/.test(n))).toBe(true);
  });

  it("lists trunk domestic destinations from Jakarta", () => {
    const airLines = TRANSIT_LINES.filter((l) => l.mode === "AIRPORT_COMMERCIAL");
    expect(airLines.length).toBeGreaterThanOrEqual(4);
    const names = TRANSIT_STOPS.map((s) => s.name);
    for (const must of ["Denpasar", "Juanda", "Kualanamu", "Sultan Hasanuddin"]) {
      expect(names.some((n) => n.includes(must)), must).toBe(true);
    }
  });

  it("carries airline operators and priced flights", () => {
    const airOps = INTERCITY_OPERATORS.filter((o) => o.mode === "AIRPORT_COMMERCIAL");
    expect(airOps.length).toBeGreaterThanOrEqual(3);
    const airRuns = INTERCITY_RUNS.filter((r) => airOps.some((o) => o.code === r.operatorCode));
    expect(airRuns.length).toBeGreaterThanOrEqual(3);
    for (const run of airRuns) {
      expect(run.fareRp, run.tripCode).toBeGreaterThan(300000);
    }
  });

  it("keeps air corridor lines in the intercity region", () => {
    const airLines = TRANSIT_LINES.filter(
      (l) => l.mode === "AIRPORT_COMMERCIAL" && l.id.startsWith("line-air-cgk")
    );
    expect(airLines.length).toBeGreaterThanOrEqual(3);
    for (const line of airLines) {
      expect(line.regionId).toBe("reg-intercity-01");
    }
  });
});

describe("shuttle/air persistence", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.timetableRun.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
  });

  it("seeds every shuttle and air operator with boarding points", async () => {
    const operators = await db.intercityOperator.findMany({ include: { boardingPoints: true } });
    const byCode = operators.map((o) => o.name);
    for (const must of ["DayTrans", "Cititrans", "Baraya", "Garuda", "Citilink"]) {
      expect(byCode.some((n) => n.includes(must)), must).toBe(true);
    }
    const shuttleOps = operators.filter((o) => o.mode === "EXECUTIVE_SHUTTLE");
    for (const op of shuttleOps) {
      expect(op.boardingPoints.length, op.name).toBeGreaterThanOrEqual(1);
    }
  });
});
