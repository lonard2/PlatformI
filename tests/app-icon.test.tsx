/**
 * Tab identity guard: the app icon exists, is valid SVG, and carries the
 * PlatformI midnight-glass brand (midnight tile + signal-cyan route).
 * Guards against regressions back to the missing-/favicon.ico 404 era.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

describe("app icon", () => {
  const iconPath = path.join(process.cwd(), "src/app/icon.svg");

  it("exists as well-formed SVG with a square viewBox", () => {
    expect(existsSync(iconPath)).toBe(true);
    const svg = readFileSync(iconPath, "utf-8").trim();
    expect(svg.startsWith("<svg")).toBe(true);
    const box = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(box).not.toBeNull();
    expect(box![1]).toBe(box![2]);
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("uses the midnight tile and signal-cyan route", () => {
    const svg = readFileSync(iconPath, "utf-8");
    expect(svg).toContain("#090d16");
    expect(svg).toContain("#06b6d4");
  });
});
