# PlatformI Database Guide

## Which database for what

| Use | Database | How |
|-----|----------|-----|
| Tests | SQLite (fast, file-based) | default `DATABASE_URL="file:./dev.db"` (resolves under `prisma/`) |
| Local dev | SQLite (default) | same as tests |
| Prod-parity / staging | Postgres 16 | `docker compose up -d db`, then the Postgres URL below |

`src/lib/db.ts` picks the driver adapter from the `DATABASE_URL` scheme
(`file:` → better-sqlite3, `postgres*:` → `pg` Pool). Anything else throws
instead of connecting somewhere unexpected.

## Schemas (two files, one-line difference)

- `prisma/schema.prisma` — sqlite, the default for every existing command.
- `prisma/schema.postgresql.prisma` — identical models, `provider = "postgresql"`.
- `tests/prisma-schema-parity.test.ts` fails the suite if the models drift apart.

## Commands

| Task | Command |
|------|---------|
| Generate (sqlite default) | `npm run db:generate` |
| Generate (either) | `npm run db:generate:sqlite` / `npm run db:generate:pg` |
| Push schema (sqlite) | `npm run db:push` / `npm run db:push:sqlite` |
| Push schema (postgres) | `DATABASE_URL="postgresql://platformi:platformi@localhost:5433/platformi" npm run db:push:pg` |
| Seed | `npm run db:seed` (honors `DATABASE_URL`; end the `pg` Pool or the script hangs — see below) |
| Start local Postgres | `docker compose up -d db` (host port `5433`, leaves `5432` free) |
| Stop local Postgres | `docker compose stop db` |

## Neon (hosted) wiring

Paste the Neon connection string as `DATABASE_URL`. No other change is
needed: the adapter, schema selection, and seeds all follow the URL.
Use the pooled URL for the app and the direct URL for `db:push`.

## Troubleshooting

- **Root `dev.db` trap**: `file:./dev.db` resolves to `prisma/dev.db` by
  convention (`resolveSqliteFile()`); a stray `./dev.db` at the repo root
  means a command ran with the wrong working directory or URL. Delete the
  stray file, never commit it.
- **Seed hangs against Postgres**: the `pg` Pool keeps the process alive.
  Scripts must `await pool.end()` (or process-exit explicitly) after seeding.
- **Wrong adapter error**: `Unsupported DATABASE_URL scheme` means the URL
  is neither `file:` nor `postgres*:` — check for typos, not the code.
- **Docker daemon down**: `docker compose` commands fail; start Docker
  Desktop (macOS) or fall back to a hosted Postgres URL.
