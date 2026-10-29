/**
 * Guards the two-provider design: prisma/schema.prisma (sqlite default)
 * and prisma/schema.postgresql.prisma must carry byte-identical model
 * definitions, so neither dialect drifts silently. The files differ only
 * in the datasource provider line.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function modelSection(relativePath: string): string {
  const text = readFileSync(path.join(process.cwd(), relativePath), "utf-8");
  const idx = text.indexOf("model Region {");
  expect(idx).toBeGreaterThan(-1);
  return text.slice(idx).trim();
}

describe("prisma schema parity", () => {
  it("sqlite and postgresql schemas share identical models", () => {
    expect(modelSection("prisma/schema.prisma")).toBe(
      modelSection("prisma/schema.postgresql.prisma")
    );
  });

  it("only the provider line differs between the two schemas", () => {
    const a = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf-8");
    const b = readFileSync(
      path.join(process.cwd(), "prisma/schema.postgresql.prisma"),
      "utf-8"
    );
    expect(b.replace('provider = "postgresql"', 'provider = "sqlite"')).toBe(a);
  });
});
