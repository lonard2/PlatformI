import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolveSqliteFile() }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
