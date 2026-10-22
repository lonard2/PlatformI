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
});
