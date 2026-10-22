// tests/region-box.test.ts
import { describe, it, expect } from "vitest";
import { isInsideJabodetabek } from "@/lib/transit/regionBox";
describe("region box", () => {
  it("keeps Gambir inside and Surabaya outside", () => {
    expect(isInsideJabodetabek(-6.176, 106.830)).toBe(true);
    expect(isInsideJabodetabek(-7.265, 112.745)).toBe(false);
  });
});
