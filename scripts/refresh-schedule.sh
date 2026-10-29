#!/usr/bin/env bash
# refresh-schedule.sh — fail-closed GTFS refresh.
#
# 1. Derives to a temp file (never touches the committed artifact).
# 2. Assesses via scripts/assess-refresh-run.ts (exit 0 promote / 2 quarantine / 1 failed).
# 3. Promotes (cp) or quarantines to var/quarantine/<ts>/ with report.json.
# The committed artifact, the dev DB, and the UI stamps are untouched unless
# the assessment says promote.
set -euo pipefail

FEED_URL="${GTFS_FEED_URL:-https://gtfs.transjakarta.co.id/files/file_gtfs.zip}"
ARTIFACT="src/lib/data/gtfs-derived.json"
RUN_TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
CANDIDATE="$WORKDIR/gtfs-derived.json"
REPORT="$WORKDIR/report.json"

# The generated client is provider-bound: make sure its flavor matches DATABASE_URL.
GENERATED_PG=0
if [[ "${DATABASE_URL:-}" == postgres* ]]; then
  echo "[refresh] generating postgres client..."
  npx prisma generate --schema=prisma/schema.postgresql.prisma
  GENERATED_PG=1
fi

echo "[refresh] deriving to temp..."
if ! python3 scripts/derive-gtfs-schedule.py --feed-url "$FEED_URL" --out "$CANDIDATE"; then
  echo "[refresh] derive failed (network or feed error); recording failed run"
  npx tsx scripts/assess-refresh-run.ts --report-out "$REPORT" --feed-url "$FEED_URL" || true
  mkdir -p "var/quarantine/$RUN_TS"
  cp "$REPORT" "var/quarantine/$RUN_TS/report.json" 2>/dev/null || true
  exit 1
fi

echo "[refresh] assessing candidate..."
set +e
npx tsx scripts/assess-refresh-run.ts \
  --candidate "$CANDIDATE" \
  --current "$ARTIFACT" \
  --report-out "$REPORT" \
  --feed-url "$FEED_URL"
CODE=$?
set -e

if [ "$CODE" -eq 0 ]; then
  cp "$CANDIDATE" "$ARTIFACT"
  echo "[refresh] PROMOTED $ARTIFACT"
fi

if [ "$GENERATED_PG" -eq 1 ]; then
  echo "[refresh] restoring default sqlite client..."
  npx prisma generate --schema=prisma/schema.prisma
fi

if [ "$CODE" -eq 0 ]; then
  exit 0
fi

mkdir -p "var/quarantine/$RUN_TS"
cp "$CANDIDATE" "var/quarantine/$RUN_TS/gtfs-derived.json"
cp "$REPORT" "var/quarantine/$RUN_TS/report.json"
echo "[refresh] QUARANTINED to var/quarantine/$RUN_TS (exit $CODE)"
exit "$CODE"
