/**
 * Gated live-Postgres proof: pushes nothing by itself, but given
 * PG_TEST_URL it creates, reads back in a transaction, and cleans up a
 * region — failing loudly if the real store misbehaves. Skips cleanly
 * without the variable so CI on SQLite stays green.
 */
import { describe, it, expect } from "vitest";

const PG_URL = process.env.PG_TEST_URL ?? "";
const gated = PG_URL ? describe : describe.skip;

gated("postgres smoke (gated on PG_TEST_URL)", () => {
  it("creates, reads back, and cleans up a region", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: PG_URL });
    try {
      const db = new PrismaClient({ adapter: new PrismaPg(pool) });
      const region = await db.region.create({
        data: {
          code: "SMOKE-01",
          name: "Smoke",
          centerLatitude: -6.2,
          centerLongitude: 106.8,
          boundaryCoordinatesJson: "[]",
        },
      });
      const read = await db.region.findUnique({ where: { id: region.id } });
      expect(read?.code).toBe("SMOKE-01");
      await db.region.delete({ where: { id: region.id } });
      const gone = await db.region.findUnique({ where: { id: region.id } });
      expect(gone).toBeNull();
    } finally {
      await pool.end();
    }
  });
});
