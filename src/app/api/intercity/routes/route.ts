/**
 * PlatformI - Intercity Routes Lookup API
 *
 * Read-only endpoint over intercity timetable runs with strict query
 * validation. Operator names pass through verbatim from the database
 * (no translation). Unknown companies return an empty list, not an error.
 * A `date` filter (YYYY-MM-DD) restricts runs to that single weekday using
 * each run's `daysOfWeekJson` schedule; runs without a schedule run daily.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type {
  DivergenceReason,
  TimetableRun,
  TimetableStopTime,
  TripOperationalType,
} from "@/types/transit";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD date into a UTC weekday (0 = Sunday). Returns null for
 * malformed values, including calendar-overflow dates such as 2026-02-30.
 */
function parseDateToWeekday(date: string): number | null {
  if (!DATE_PATTERN.test(date)) {
    return null;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed.getUTCDay();
}

function parseNumberArray(raw: string | null): number[] | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as number[]) : undefined;
  } catch {
    return undefined;
  }
}

function parseStringArray(raw: string | null): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : undefined;
  } catch {
    return undefined;
  }
}

function parseStopTimes(raw: string | null): TimetableStopTime[] | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TimetableStopTime[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Company matches an operator by code-derived id (e.g. "KAI" -> "op-kai"),
 * exact id, or case-insensitive substring of the stored operator name.
 * The stored name is never translated; it passes through verbatim.
 */
function matchesCompany(operatorName: string, operatorId: string, company: string): boolean {
  const needle = company.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return (
    operatorName.toLowerCase().includes(needle) ||
    operatorId.toLowerCase() === `op-${needle}` ||
    operatorId.toLowerCase() === needle
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const company = searchParams.get("company");
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const date = searchParams.get("date");

  let weekday: number | null = null;
  if (date !== null && date.trim().length > 0) {
    weekday = parseDateToWeekday(date.trim());
    if (weekday === null) {
      return NextResponse.json(
        { error: `Invalid date "${date}". Use YYYY-MM-DD format.` },
        { status: 400 },
      );
    }
  }

  try {
    const operators = await db.intercityOperator.findMany();

    let allowedOperatorIds: Set<string> | null = null;
    if (
      (company !== null && company.trim().length > 0) ||
      (mode !== null && mode.trim().length > 0)
    ) {
      const modeNeedle = mode === null ? null : mode.trim();
      const matched = operators.filter((operator) => {
        const companyOk =
          company === null || company.trim().length === 0 || matchesCompany(operator.name, operator.id, company);
        const modeOk = modeNeedle === null || modeNeedle.length === 0 || operator.mode === modeNeedle;
        return companyOk && modeOk;
      });
      if (matched.length === 0) {
        return NextResponse.json({ runs: [] });
      }
      allowedOperatorIds = new Set(matched.map((operator) => operator.id));
    }

    const rows = await db.timetableRun.findMany({
      where: { operatorId: { not: null } },
      orderBy: { departureTime: "asc" },
    });

    const originNeedle = origin === null ? null : origin.trim().toLowerCase();
    const destinationNeedle = destination === null ? null : destination.trim().toLowerCase();

    const runs: TimetableRun[] = [];
    for (const row of rows) {
      if (allowedOperatorIds !== null && (row.operatorId === null || !allowedOperatorIds.has(row.operatorId))) {
        continue;
      }
      if (originNeedle && !row.origin.toLowerCase().includes(originNeedle)) {
        continue;
      }
      if (destinationNeedle && !row.destination.toLowerCase().includes(destinationNeedle)) {
        continue;
      }
      const daysOfWeek = parseNumberArray(row.daysOfWeekJson);
      if (weekday !== null && daysOfWeek !== undefined && !daysOfWeek.includes(weekday)) {
        continue;
      }
      runs.push({
        id: row.id,
        lineId: row.lineId,
        tripCode: row.tripCode,
        origin: row.origin,
        destination: row.destination,
        departureTime: row.departureTime,
        arrivalTime: row.arrivalTime,
        operatorName: row.operatorName,
        operatorId: row.operatorId ?? undefined,
        boardingPointIds: parseStringArray(row.boardingPointIdsJson),
        serviceClass: row.serviceClass ?? undefined,
        fareRp: row.fareRp ?? undefined,
        gateOrBay: row.gateOrBay ?? undefined,        notes: row.notes ?? undefined,
        baggageBelt: row.baggageBelt ?? undefined,
        daysOfWeek,
        stopTimes: parseStopTimes(row.stopTimesJson),
        tripType: (row.tripType as TripOperationalType) || "REGULAR",
        divergenceReason: (row.divergenceReason as DivergenceReason) || "NONE",
        divergenceDescription: row.divergenceDescription ?? undefined,
        terminatedEarlyStopId: row.terminatedEarlyStopId ?? undefined,
        divergedFromStopId: row.divergedFromStopId ?? undefined,
      });
    }

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      {
        runs: [],
        error: error instanceof Error ? error.message : "Failed to retrieve intercity routes",
      },
      { status: 500 },
    );
  }
}
