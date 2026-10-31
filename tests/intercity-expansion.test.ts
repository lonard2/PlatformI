/**
 * RED: intercity expansion — dual-region lines appear in both scopes;
 * slice v2 covers Senen gateway + Bandung/Yogya AKAP/Pelni corridors;
 * the dataset backfills Halim, Marina Ancol, island and port stops.
 * Todo 2: runs carry representative class fares, hub prefers them.
 */
import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as routesGet } from "@/app/api/intercity/routes/route";
import { linesInRegion } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { INTERCITY_OPERATORS, INTERCITY_RUNS } from "../prisma/seed-intercity";
import { resolveIntercityFare } from "@/components/ticketing/IntercityTicketHub";
import { db } from "@/lib/db";

const INTERCITY = "reg-intercity-01";
const JABODETABEK = "reg-jabodetabek-01";

describe("intercity expansion", () => {
  it("includes dual-region lines in both scopes", () => {
    const lines = [
      { id: "l1", regionId: JABODETABEK, regionIds: [JABODETABEK, INTERCITY] },
      { id: "l2", regionId: JABODETABEK },
    ];
    expect(linesInRegion(lines, INTERCITY).map((l) => l.id)).toEqual(["l1"]);
    expect(linesInRegion(lines, JABODETABEK).map((l) => l.id).sort()).toEqual(["l1", "l2"]);
  });

  it("lists Whoosh in both regions", () => {
    const whoosh = TRANSIT_LINES.find((l) => l.id === "line-whoosh-hsr");
    expect(whoosh).toBeDefined();
    expect([whoosh?.regionId, ...(whoosh?.regionIds ?? [])]).toContain(INTERCITY);
    expect([whoosh?.regionId, ...(whoosh?.regionIds ?? [])]).toContain(JABODETABEK);
  });

  it("runs Senen-gateway and Bandung/Yogya corridors in slice v2", () => {
    const destinations = INTERCITY_RUNS.map((r) => r.destination);
    for (const must of ["Bandung", "Yogyakarta", "Surabaya", "Malang"]) {
      expect(destinations.some((d) => d.includes(must)), must).toBe(true);
    }
    expect(INTERCITY_OPERATORS.map((o) => o.code)).toContain("KAI");
    const codes = INTERCITY_OPERATORS.map((o) => o.code);
    expect(codes.some((c) => c !== "KAI")).toBe(true);
  });

  it("covers AKAP terminals, Pelni ports, speedboat islands, and Halim", () => {
    const names = TRANSIT_STOPS.map((s) => s.name);
    for (const must of [
      "Kampung Rambutan",
      "Kalideres",
      "Tanjung Priok",
      "Belawan",
      "Mangkang",
      "Tidung",
      "Pramuka",
      "Marina Ancol",
      "Halim",
    ]) {
      expect(names.some((n) => n.includes(must)), must).toBe(true);
    }
  });
});

describe("intercity run fares", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.timetableRun.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
      createdIds.length = 0;
    }
  });

  it("prices every slice run with a representative class fare", () => {
    for (const row of INTERCITY_RUNS) {
      expect(Number.isInteger(row.fareRp), row.tripCode).toBe(true);
      expect(row.fareRp as number, row.tripCode).toBeGreaterThan(0);
    }
  });

  it("prefers the run fare over the mode base in the hub", () => {
    expect(resolveIntercityFare("KAI_INTERCITY", "Eksekutif Taksaka", 500000)).toBe(500000);
    expect(resolveIntercityFare("KAI_INTERCITY", "Eksekutif Taksaka")).toBeGreaterThan(0);
    expect(resolveIntercityFare("KAI_INTERCITY", "Eksekutif Taksaka", null)).toBeGreaterThan(0);
  });

  it("serves run fares through the routes API", async () => {
    const created = await db.timetableRun.create({
      data: {
        id: "run-fare-probe",
        lineId: "line-kai-intercity",
        tripCode: "KA-PROBE-1",
        origin: "Stasiun Gambir (GMR)",
        destination: "Stasiun Bandung (BD)",
        departureTime: "06:30",
        arrivalTime: "09:35",
        operatorName: "PT Kereta Api Indonesia (Persero)",
        operatorId: "op-kai",
        serviceClass: "Eksekutif Parahyangan",
        fareRp: 150000,
      },
    });
    createdIds.push(created.id);
    const res = await routesGet(
      new NextRequest("http://localhost:3000/api/intercity/routes?origin=gambir", { method: "GET" })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { runs: Array<{ tripCode: string; fareRp?: number }> };
    const mine = json.runs.find((r) => r.tripCode === "KA-PROBE-1");
    expect(mine?.fareRp).toBe(150000);
  });
});

describe("dual-region stop scoping", () => {
  it("keeps a corridor's far-end stops off the metro view", async () => {
    const { inRegionBox } = await import("@/lib/stores/useRegionStore");
    const jabodetabek = {
      boundaryCoordinates: [
        { latitude: -6.08, longitude: 106.65 },
        { latitude: -6.08, longitude: 107.05 },
        { latitude: -6.42, longitude: 107.05 },
        { latitude: -6.42, longitude: 106.65 },
      ],
    };
    // Jakarta-side stop renders; Bandung far end does not.
    expect(inRegionBox({ latitude: -6.21, longitude: 106.95 }, jabodetabek)).toBe(true);
    expect(inRegionBox({ latitude: -6.9147, longitude: 107.6026 }, jabodetabek)).toBe(false);
    // No boundary means "no culling" rather than a blank map.
    expect(inRegionBox({ latitude: 3.64, longitude: 98.88 }, null)).toBe(true);
  });
});
