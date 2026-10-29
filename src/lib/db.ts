import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Routes the driver adapter from the DATABASE_URL scheme. `file:` stays on
 * better-sqlite3; `postgresql:`/`postgres:` uses a pg Pool. Anything else
 * throws instead of guessing which database to open.
 */
export function resolveDbKind(url: string): "sqlite" | "postgresql" {
  const scheme = url.split(":")[0]?.toLowerCase();
  if (scheme === "file") return "sqlite";
  if (scheme === "postgresql" || scheme === "postgres") return "postgresql";
  throw new Error(`Unsupported DATABASE_URL scheme: ${scheme ?? "(empty)"}`);
}

/**
 * Resolves the SQLite file honoring DATABASE_URL. Relative `file:` paths
 * follow the Prisma convention (relative to prisma/), and every entrypoint
 * (next dev/build/start, vitest, tsx seeds) runs with the repo root as CWD.
 */
export function resolveSqliteFile(): string {
  const raw = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(
    /^file:/,
    ""
  );
  if (path.isAbsolute(raw)) return raw;
  const rel = raw.replace(/^\.\//, "");
  const underPrisma = rel.startsWith("prisma/") ? rel : path.join("prisma", rel);
  return path.join(process.cwd(), underPrisma);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter(url: string) {
  if (resolveDbKind(url) === "postgresql") {
    return new PrismaPg(new Pool({ connectionString: url }));
  }
  return new PrismaBetterSqlite3({ url: resolveSqliteFile() });
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(
      process.env.DATABASE_URL ?? "file:./prisma/dev.db"
    ),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
