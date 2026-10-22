/**
 * PlatformI - Intercity Schematic Progress Line
 * Pure presentational outside-region tracker for followed intercity trips.
 * Renders stop ticks with names and a live position marker along a
 * horizontal schematic line. No Leaflet dependency, no data fetching:
 * the run resolves synchronously from the bundled timetable dataset and
 * the position fraction is supplied by the caller (timetable plus
 * simulation-clock interpolation via `computeSchematicFraction`).
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React, { useMemo } from "react";
import { MapPin, Route } from "lucide-react";
import type { TimetableRun } from "@/types/transit";
import { DEFAULT_TIMETABLE_RUNS } from "@/lib/data/defaultTimetables";
import { useTranslation } from "@/lib/i18n";

export interface IntercitySchematicProps {
  runId: string;
  fraction: number;
}

function parseHhMmToMinutes(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 24 || minutes > 59) return null;
  if (hours === 24 && minutes !== 0) return null;
  return (hours === 24 ? 0 : hours) * 60 + minutes;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function sortedStopTimes(run: TimetableRun) {
  return (run.stopTimes ?? [])
    .filter((st) => !st.isTerminatedEarly)
    .slice()
    .sort((a, b) => a.stopSequence - b.stopSequence);
}

/**
 * Resolves the stop tick labels for a run: structured `stopTimesJson`
 * station names in sequence order when present, otherwise the
 * origin and destination fallback. Unknown run ids degrade to the
 * run id label so the schematic never crashes.
 */
export function getSchematicStops(
  run: TimetableRun | undefined,
  runId: string
): string[] {
  if (!run) return [runId];
  const times = sortedStopTimes(run);
  if (times.length > 0) return times.map((st) => st.stopName);
  return [run.origin, run.destination];
}

interface SchematicWindow {
  departureMinutes: number;
  durationMinutes: number;
  overnight: boolean;
}

function resolveSchematicWindow(run: TimetableRun): SchematicWindow | null {
  const times = sortedStopTimes(run);
  const first = times[0];
  const last = times[times.length - 1];
  const departureStr =
    first !== undefined
      ? first.departureTime || first.arrivalTime
      : run.departureTime;
  const arrivalStr =
    last !== undefined
      ? last.arrivalTime || last.departureTime
      : run.arrivalTime;
  const departureMinutes = parseHhMmToMinutes(departureStr);
  const arrivalMinutes = parseHhMmToMinutes(arrivalStr);
  if (departureMinutes === null || arrivalMinutes === null) return null;
  const durationMinutes = arrivalMinutes - departureMinutes;
  // A zero-duration window carries no progress information, so it is
  // invalid; a negative window crosses midnight into the next day.
  if (durationMinutes === 0) return null;
  const overnight = durationMinutes < 0;
  return {
    departureMinutes,
    durationMinutes: overnight ? durationMinutes + 1440 : durationMinutes,
    overnight,
  };
}

/**
 * Interpolates timetable progress for the simulation clock: the fraction
 * of the departure-to-arrival window elapsed at `nowMs`, clamped to 0..1.
 * `nowMs` is read as Asia/Jakarta wall-clock minutes so schedule times
 * (authored in WIB) compare correctly. Overnight windows crossing
 * midnight are supported; trips before departure read 0, after arrival 1.
 */
export function computeSchematicFraction(
  run: TimetableRun | undefined,
  nowMs: number
): number {
  if (!run || !Number.isFinite(nowMs)) return 0;
  const window = resolveSchematicWindow(run);
  if (!window) return 0;
  const wallClock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(nowMs));
  const nowMinutes = parseHhMmToMinutes(wallClock);
  if (nowMinutes === null) return 0;
  let elapsed = nowMinutes - window.departureMinutes;
  if (window.overnight && elapsed < 0) elapsed += 1440;
  if (window.overnight && elapsed > window.durationMinutes) {
    // Past midnight but beyond the arrival tail: snap to the nearest run
    // instance — just-completed reads 1, long-before-departure reads 0.
    const gap = 1440 - window.durationMinutes;
    if (elapsed - window.durationMinutes > gap / 2) return 0;
    return 1;
  }
  return clamp01(elapsed / window.durationMinutes);
}

export function IntercitySchematic({ runId, fraction }: IntercitySchematicProps) {
  const { t } = useTranslation();
  const run = useMemo(
    () => DEFAULT_TIMETABLE_RUNS.find((r) => r.id === runId),
    [runId]
  );
  const stops = useMemo(() => getSchematicStops(run, runId), [run, runId]);
  const clamped = clamp01(fraction);
  const positionPercent = clamped * 100;

  return (
    <section
      aria-label={`${t.hubInspector.schematicTitle}: ${stops[0]} - ${stops[stops.length - 1]}`}
      data-testid="intercity-schematic"
      className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-200">
          <Route className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
          <span>{t.hubInspector.schematicTitle}</span>
        </span>
        {run?.tripCode && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 shrink-0">
            {run.tripCode}
          </span>
        )}
      </div>

      <div className="relative h-7" aria-hidden="true">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-800" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
          style={{ width: `${positionPercent}%` }}
        />
        {stops.map((stopName, idx) => {
          const left =
            stops.length === 1 ? 50 : (idx / (stops.length - 1)) * 100;
          return (
            <span
              key={`${stopName}-${idx}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-indigo-300"
              style={{ left: `${left}%` }}
            />
          );
        })}
        <span
          className="absolute top-0 -translate-x-1/2 -translate-y-1"
          style={{ left: `${positionPercent}%` }}
        >
          <MapPin className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        </span>
      </div>

      <div
        role="img"
        aria-label={`${t.hubInspector.schematicPosition}: ${Math.round(positionPercent)}%`}
        className="flex items-start justify-between gap-1"
      >
        {stops.map((stopName, idx) => (
          <span
            key={`${stopName}-${idx}`}
            className={`text-[10px] font-mono leading-tight truncate ${
              idx === 0
                ? "text-left text-indigo-200 font-bold"
                : idx === stops.length - 1
                ? "text-right text-indigo-200 font-bold"
                : "text-center text-slate-400"
            } ${stops.length > 2 ? "max-w-[30%]" : "max-w-[45%]"}`}
          >
            {stopName}
          </span>
        ))}
      </div>
    </section>
  );
}
