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

  it("seed validation rejects an unknown boarding point naming trip and point codes", async () => {
    const { validateIntercitySeedRow } = await import("../prisma/seed-intercity");
    expect(() =>
      validateIntercitySeedRow({
        tripCode: "KA-101",
        lineCode: "KAI",
        origin: "Stasiun Gambir (GMR)",
        destination: "Surabaya Pasarturi (SBI)",
        departureTime: "08:20",
        arrivalTime: "16:30",
        operatorCode: "KAI",
        boardingPointCodes: ["GMR-GATE-C"],
      }),
    ).toThrow(/GMR-GATE-C/);
  });
});

describe("intercity lookup APIs", () => {
  it("lists operators", async () => {
    const { GET } = await import("@/app/api/intercity/operators/route");
    const res = await GET(new Request("http://localhost/api/intercity/operators"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { operators: unknown[] };
    expect(Array.isArray(body.operators)).toBe(true);
  });

  it("filters routes by mode and company", async () => {
    const { GET } = await import("@/app/api/intercity/routes/route");
    const res = await GET(
      new Request("http://localhost/api/intercity/routes?mode=KAI_INTERCITY&company=KAI"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: { operatorName: string }[] };
    expect(Array.isArray(body.runs)).toBe(true);
    for (const run of body.runs) {
      expect(typeof run.operatorName).toBe("string");
    }
  });

  it("returns an empty list for unknown companies", async () => {
    const { GET } = await import("@/app/api/intercity/routes/route");
    const res = await GET(
      new Request("http://localhost/api/intercity/routes?company=NO_SUCH_OPERATOR"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: unknown[] };
    expect(body.runs).toEqual([]);
  });

  it("rejects malformed date filters", async () => {
    const { GET } = await import("@/app/api/intercity/routes/route");
    const res = await GET(
      new Request("http://localhost/api/intercity/routes?date=not-a-date"),
    );
    expect(res.status).toBe(400);
  });

  it("filters runs to a single day", async () => {
    const { GET } = await import("@/app/api/intercity/routes/route");
    const res = await GET(
      new Request("http://localhost/api/intercity/routes?date=2026-10-26"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runs: { daysOfWeek?: number[] }[] };
    expect(Array.isArray(body.runs)).toBe(true);
    const weekday = new Date("2026-10-26T00:00:00Z").getUTCDay();
    for (const run of body.runs) {
      if (run.daysOfWeek) {
        expect(run.daysOfWeek).toContain(weekday);
      }
    }
  });
});
