import { describe, it, expect } from "vitest";
import { getSalesRules, OPERATOR_POINT_LISTS } from "@/lib/transit/salesMatrix";

describe("sales matrix", () => {
  it("gives rail no drop-off and Argo Executive no free meal", () => {
    expect(getSalesRules("KAI_INTERCITY", "Eksekutif").dropOff).toBe("none");
    expect(getSalesRules("KAI_INTERCITY", "Eksekutif").meal).toBe("paid");
    expect(getSalesRules("KAI_INTERCITY", "Luxury").meal).toBe("included");
  });

  it("gives Suite class an included meal and every rail class no drop-off", () => {
    expect(getSalesRules("KAI_INTERCITY", "Suite Class").meal).toBe("included");
    expect(getSalesRules("KAI_INTERCITY", "Ekonomi").dropOff).toBe("none");
    expect(getSalesRules("KAI_INTERCITY", "Ekonomi").meal).toBe("paid");
    expect(getSalesRules("WHOOSH_HSR", "Premium Economy").dropOff).toBe("none");
  });

  it("charges LCC flight buyers for meal and baggage but includes them full-service", () => {
    const lcc = getSalesRules("AIRPORT_COMMERCIAL", "Lion Air Economy");
    expect(lcc.meal).toBe("paid");
    expect(lcc.baggage).toBe("paid");
    expect(lcc.idRequired).toBe(true);
    const full = getSalesRules("AIRPORT_COMMERCIAL", "Garuda Indonesia Business");
    expect(full.meal).toBe("included");
    expect(full.baggage).toBe("included");
    expect(full.idRequired).toBe(true);
  });

  it("gives AKAP boarding points only with no door drop-off and no mandatory ID", () => {
    const akap = getSalesRules("AKAP_INTERCITY_BUS", "Executive");
    expect(akap.dropOff).toBe("none");
    expect(akap.seatMap).toBe(true);
    expect(akap.idRequired).toBe(false);
  });

  it("restricts shuttle drop-off to the operator point list", () => {
    const shuttle = getSalesRules("EXECUTIVE_SHUTTLE", "VIP");
    expect(shuttle.dropOff).toBe("operator-list");
    expect(shuttle.idRequired).toBe(false);
    expect(OPERATOR_POINT_LISTS["DayTrans"].length).toBeGreaterThan(0);
    expect(OPERATOR_POINT_LISTS["Baraya Travel"].length).toBeGreaterThan(0);
  });

  it("requires ID for PELNI and shows a deck map with meal", () => {
    const pelni = getSalesRules("MARITIME_PELNI", "Ekonomi");
    expect(pelni.idRequired).toBe(true);
    expect(pelni.seatMap).toBe(true);
    expect(pelni.meal).toBe("included");
    expect(pelni.dropOff).toBe("none");
  });

  it("defaults unknown future modes to the strictest safe rule", () => {
    const fallback = getSalesRules("FUTURE_MONORAIL_X");
    expect(fallback.seatMap).toBe(true);
    expect(fallback.meal).toBe("none");
    expect(fallback.dropOff).toBe("none");
    expect(fallback.idRequired).toBe(true);
  });
});
