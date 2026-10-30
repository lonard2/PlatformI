/**
 * RED: intercity expansion — dual-region lines appear in both scopes;
 * slice v2 covers Senen gateway + Bandung/Yogya AKAP/Pelni corridors;
 * the dataset backfills Halim, Marina Ancol, island and port stops.
 */
import { describe, it, expect } from "vitest";
import { linesInRegion } from "@/lib/stores/useRegionStore";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { INTERCITY_OPERATORS, INTERCITY_RUNS } from "../prisma/seed-intercity";

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
