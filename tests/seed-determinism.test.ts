/**
 * RED: reproducible scratch reseeds — seeding twice to fresh temp DBs
 * yields identical line/stop/vehicle counts, and no scratch files remain.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

function seedScratch(tag: string): Record<string, number> {
  const out = execSync(`npm run --silent db:seed:scratch -- --scratch-tag=${tag}`, {
    cwd: process.cwd(),
    encoding: "utf-8",
    timeout: 240000,
  });
  const counts: Record<string, number> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^(LINES|STOPS|VEHICLES)=(\d+)$/);
    if (m) counts[m[1]] = Number(m[2]);
  }
  return counts;
}

describe("scratch reseed determinism", () => {
  it("two fresh reseeds produce identical counts and clean up", () => {
    const first = seedScratch("a");
    const second = seedScratch("b");
    expect(first.LINES).toBeGreaterThan(0);
    expect(first.STOPS).toBeGreaterThan(2000);
    expect(first.VEHICLES).toBeGreaterThan(0);
    expect(second).toEqual(first);
    const leftovers = readdirSync(path.join(process.cwd(), "prisma")).filter((f) =>
      f.startsWith("scratch-verify-")
    );
    expect(leftovers).toEqual([]);
  }, 240000);
});
