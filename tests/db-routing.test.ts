/**
 * RED: db.ts routes the driver adapter from the DATABASE_URL scheme —
 * file: URLs stay on better-sqlite3, postgres:// URLs use pg, and
 * anything else throws instead of guessing. Bare relative sqlite paths
 * keep resolving under prisma/.
 */
import { describe, it, expect, afterEach } from "vitest";
import { resolveDbKind, resolveSqliteFile } from "@/lib/db";

describe("resolveDbKind", () => {
  it("routes file: URLs to sqlite", () => {
    expect(resolveDbKind("file:./prisma/dev.db")).toBe("sqlite");
    expect(resolveDbKind("file:./dev.db")).toBe("sqlite");
  });

  it("routes postgres schemes to postgresql", () => {
    expect(resolveDbKind("postgresql://u:p@localhost:5433/platformi")).toBe(
      "postgresql"
    );
    expect(resolveDbKind("postgres://u:p@localhost:5433/platformi")).toBe(
      "postgresql"
    );
  });

  it("rejects anything else instead of guessing", () => {
    expect(() => resolveDbKind("mysql://x")).toThrow(/unsupported/i);
  });

  it("keeps bare relative sqlite files under prisma/", () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "file:./dev.db";
    try {
      expect(resolveSqliteFile()).toMatch(/prisma\/dev\.db$/);
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prev;
    }
  });
});
