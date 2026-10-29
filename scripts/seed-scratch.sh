#!/usr/bin/env bash
# seed-scratch.sh — reseed into a temp SQLite file, print counts, delete it.
# Usage: npm run db:seed:scratch -- --scratch-tag=<tag>
set -euo pipefail

TAG="manual"
for arg in "$@"; do
  case "$arg" in
    --scratch-tag=*) TAG="${arg#--scratch-tag=}" ;;
  esac
done

# Keep to safe filename characters: this value interpolates into an rm glob.
TAG="$(printf '%s' "$TAG" | tr -cd '[:alnum:]_-')"
[ -n "$TAG" ] || TAG="manual"
# Config-consistent path: prisma CLI resolves file: URLs from the repo root
# while resolveSqliteFile() maps them under prisma/ — file:./prisma/<name>
# is the one form both agree on.
export DATABASE_URL="file:./prisma/scratch-verify-${TAG}.db"
trap "rm -f prisma/scratch-verify-${TAG}.db*" EXIT

npx prisma db push --schema=prisma/schema.prisma 1>/dev/null
npx tsx prisma/seed.ts 1>/dev/null
npx tsx -e "import('./src/lib/db.ts').then(async ({db, closeDb}) => { const [l,s,v] = await Promise.all([db.line.count(), db.stop.count(), db.vehicle.count()]); console.log('LINES=' + l); console.log('STOPS=' + s); console.log('VEHICLES=' + v); await closeDb(); })"
