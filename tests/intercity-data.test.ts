import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("intercity data models", () => {
  it("exposes operator and boarding-point types", async () => {
    const m = await import("@/types/transit");
    expect(typeof m).toBe("object");
  });

  it("declares IntercityOperator and BoardingPoint in transit types", () => {
    const src = readFileSync(join(process.cwd(), "src/types/transit.ts"), "utf8");
    expect(src).toContain("IntercityOperator");
    expect(src).toContain("BoardingPoint");
    expect(src).toContain("BoardingPointKind");
  });

  it("declares Prisma models and TimetableRun extensions", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model IntercityOperator");
    expect(schema).toContain("model BoardingPoint");
    expect(schema).toContain("operatorId");
    expect(schema).toContain("boardingPointIdsJson");
  });

  it("seed is idempotent on second run", async () => {
    const { seedIntercity } = await import("../prisma/seed-intercity");
    const first = await seedIntercity();
    const second = await seedIntercity();
    expect(second.runs).toBe(first.runs);
    expect(second.operators).toBe(first.operators);
    expect(first.runs).toBeGreaterThan(0);
  });

  it("seed validation rejects an invalid HH:mm time naming the trip code", async () => {
    const { validateIntercitySeedRow } = await import("../prisma/seed-intercity");
    expect(() =>
      validateIntercitySeedRow({
        tripCode: "KA-999",
        lineCode: "KAI",
        origin: "Stasiun Gambir (GMR)",
        destination: "Surabaya Pasarturi (SBI)",
        departureTime: "25:00",
        arrivalTime: "16:30",
        operatorCode: "KAI",
      }),
    ).toThrow(/KA-999/);
  });
});
