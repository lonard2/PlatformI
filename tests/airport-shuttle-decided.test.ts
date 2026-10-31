/**
 * RED: decided airport-bus fares + XTrans/Cititrans-SCBD/Batik coverage.
 * SH2 Blok M-Soetta is Rp15.000 by Kepgub 685/2026 (eff. 1 Sept 2026);
 * SH1 Kalideres-Soetta stays Rp3.500; hours 05:00-22:00, 13 SH2 stops.
 */
import { describe, it, expect } from "vitest";
import { TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";
import { INTERCITY_OPERATORS, INTERCITY_RUNS } from "../prisma/seed-intercity";

describe("decided airport bus", () => {
  it("runs SH2 Blok M-Soetta at the decided Rp15.000 fare", () => {
    const sh2 = TRANSIT_LINES.find((l) => l.id === "line-tj-sh2");
    expect(sh2).toBeDefined();
    expect(sh2?.baseFareRp).toBe(15000);
    expect(sh2?.firstDeparture).toBe("05:00");
    expect(sh2?.lastDeparture).toBe("22:00");
    const stops = TRANSIT_STOPS.filter((s) => s.lineId === "line-tj-sh2");
    expect(stops.length).toBeGreaterThanOrEqual(8);
    const names = stops.map((s) => s.name);
    for (const must of ["Blok M", "Bundaran Senayan", "FX Sudirman", "Perkantoran"]) {
      expect(names.some((n) => n.includes(must)), must).toBe(true);
    }
  });

  it("keeps SH1 Kalideres-Soetta at the normal Rp3.500 fare", () => {
    const sh1 = TRANSIT_LINES.find((l) => l.id === "line-tj-sh1");
    expect(sh1).toBeDefined();
    expect(sh1?.baseFareRp).toBe(3500);
  });
});

describe("fourth shuttle, SCBD pool, Batik Air", () => {
  it("adds XTrans with Bekasi coverage", () => {
    const codes = INTERCITY_OPERATORS.map((o) => o.code);
    expect(codes).toContain("XTRANS");
    const runs = INTERCITY_RUNS.filter((r) => r.operatorCode === "XTRANS");
    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs.every((r) => r.fareRp > 0)).toBe(true);
  });

  it("adds the Cititrans SCBD pool", () => {
    const ct = INTERCITY_OPERATORS.find((o) => o.code === "CITITRANS");
    expect(ct?.boardingPoints.map((p) => p.code)).toContain("CT-SCBD");
  });

  it("adds Batik Air on trunk corridors", () => {
    const codes = INTERCITY_OPERATORS.map((o) => o.code);
    expect(codes).toContain("IDBTK");
    const runs = INTERCITY_RUNS.filter((r) => r.operatorCode === "IDBTK");
    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs.every((r) => r.fareRp as number > 300000)).toBe(true);
  });
});
