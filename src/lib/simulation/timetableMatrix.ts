/**
 * PlatformI - Timetable Matrix & Stop-by-Trip Scheduling Engine
 *
 * Implements cascading stop-time calculations, inter-station travel duration estimation,
 * express bypass timing adjustments, and batch Pola Operasi frequency schedule generation.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import {
  Stop,
  TimetableRun,
  TimetableStopTime,
  Coordinate,
  TripOperationalType,
  DivergenceReason,
} from "@/types/transit";

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a "HH:mm" time string into minutes past midnight (0 - 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return (hours * 60 + minutes) % 1440;
}

/**
 * Converts minutes past midnight into a padded "HH:mm" string.
 */
export function minutesToTimeString(totalMinutes: number): string {
  // Normalize negative or overflow minutes
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = Math.floor(normalized % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Derives realistic operational transit speed for a given transit mode category.
 */
export function getOperationalSpeedKmh(modeCategory: string): number {
  switch (modeCategory) {
    case "WHOOSH_HSR":
      return 250;
    case "AIRPORT_COMMERCIAL":
      return 600;
    case "KAI_INTERCITY":
      return 75;
    case "KAI_BANDARA":
    case "MRT_JAKARTA":
      return 42;
    case "LRT_JABODEBEK":
    case "LRT_JAKARTA":
      return 35;
    case "KRL_COMMUTER":
      return 40;
    case "TRANSJAKARTA_BRT":
      return 24;
    case "EXECUTIVE_SHUTTLE":
      return 55;
    case "MARITIME_SPEEDBOAT":
      return 35;
    default:
      return 35;
  }
}

/**
 * Automatically computes and cascades arrival and departure times for each stop in sequence.
 * Respects any existing bypasses (`isBypass === true`), custom dwell overrides, and early terminations (`terminatedEarlyStopId`).
 */
export function cascadeStopTimes(
  initialDepartureTime: string,
  stops: Stop[],
  modeCategory: string = "MRT_JAKARTA",
  existingStopTimes?: TimetableStopTime[],
  terminatedEarlyStopId?: string
): TimetableStopTime[] {
  if (!stops || stops.length === 0) return [];

  const avgSpeed = getOperationalSpeedKmh(modeCategory);
  let currentClockMinutes = timeStringToMinutes(initialDepartureTime);

  const existingMap = new Map<string, TimetableStopTime>();
  if (existingStopTimes) {
    existingStopTimes.forEach((st) => existingMap.set(st.stopId, st));
  }

  const result: TimetableStopTime[] = [];
  let isPastTermination = false;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const prevStop = i > 0 ? stops[i - 1] : null;
    const existing = existingMap.get(stop.id);

    const isBypass = existing?.isBypass ?? false;

    // Check if previous stop was the early termination stop
    if (isPastTermination) {
      result.push({
        stopId: stop.id,
        stopName: stop.name,
        stopSequence: stop.sequence || i + 1,
        arrivalTime: "--:--",
        departureTime: "--:--",
        isBypass: false,
        isTerminatedEarly: true,
        peronOrTrack: "-",
        dwellSeconds: 0,
      });
      continue;
    }

    if (i === 0) {
      // Origin Stop
      const depTime = initialDepartureTime;
      result.push({
        stopId: stop.id,
        stopName: stop.name,
        stopSequence: stop.sequence || 1,
        arrivalTime: depTime,
        departureTime: depTime,
        isBypass: false,
        isTerminatedEarly: false,
        peronOrTrack: existing?.peronOrTrack || "Peron 1",
        dwellSeconds: 0,
      });
      currentClockMinutes = timeStringToMinutes(depTime);
    } else {
      // Intermediate or Terminus Stop
      let transitMinutes = 2; // minimum realistic transit time between adjacent stops
      if (prevStop) {
        const distKm = calculateDistanceKm(
          { latitude: prevStop.latitude, longitude: prevStop.longitude },
          { latitude: stop.latitude, longitude: stop.longitude }
        );
        const rawTravelMinutes = (distKm / Math.max(15, avgSpeed)) * 60;
        transitMinutes = Math.max(2, Math.round(rawTravelMinutes));
      }

      const arrivalMinutes = currentClockMinutes + transitMinutes;
      const arrivalStr = minutesToTimeString(arrivalMinutes);

      const isTerminationPoint = Boolean(
        (terminatedEarlyStopId && stop.id === terminatedEarlyStopId) ||
        (existing?.isTerminatedEarly === false && existingMap.get(stops[i + 1]?.id)?.isTerminatedEarly === true)
      );
      const isTerminus = isTerminationPoint || i === stops.length - 1;
      let dwellMinutes = 0;

      if (!isTerminus && !isBypass) {
        dwellMinutes = stop.isInterchange || stop.stationType === "TOD" ? 2 : 1;
      }

      const departureMinutes = isTerminus ? arrivalMinutes : arrivalMinutes + dwellMinutes;
      const departureStr = isBypass ? arrivalStr : minutesToTimeString(departureMinutes);

      result.push({
        stopId: stop.id,
        stopName: stop.name,
        stopSequence: stop.sequence || i + 1,
        arrivalTime: arrivalStr,
        departureTime: departureStr,
        isBypass,
        isTerminatedEarly: false,
        peronOrTrack: existing?.peronOrTrack || `Peron ${(i % 2) + 1}`,
        dwellSeconds: dwellMinutes * 60,
      });

      currentClockMinutes = departureMinutes;

      if (isTerminationPoint) {
        isPastTermination = true;
      }
    }
  }

  return result;
}

export interface BatchScheduleConfig {
  lineId: string;
  operatorName: string;
  stops: Stop[];
  modeCategory: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  headwayMinutes: number;
  runCodePrefix: string;
  startRunNumber?: number;
  serviceClass?: string;
  gateOrBay?: string;
  notes?: string;
  daysOfWeek?: number[];
  includeLateNightStabling?: boolean;
  stablingStopId?: string;
  stablingStopName?: string;
  lateNightStartTime?: string; // default "22:00"
}

/**
 * Generates an entire sequence of timetable runs based on an operational headway frequency pattern,
 * with authentic support for late-night depot stabling / short-turn runs.
 */
export function generateBatchTimetableRuns(config: BatchScheduleConfig): TimetableRun[] {
  const {
    lineId,
    operatorName,
    stops,
    modeCategory,
    startTime,
    endTime,
    headwayMinutes,
    runCodePrefix,
    startRunNumber = 1,
    serviceClass = "Standard Regular",
    gateOrBay = "Peron 1",
    notes = "Reguler Headway",
    daysOfWeek = [1, 2, 3, 4, 5, 6, 0],
    includeLateNightStabling = false,
    stablingStopId,
    stablingStopName,
    lateNightStartTime = "22:00",
  } = config;

  if (!stops || stops.length < 2) return [];

  const startMinutes = timeStringToMinutes(startTime);
  let endMinutes = timeStringToMinutes(endTime);
  if (endMinutes < startMinutes) {
    endMinutes += 1440; // overnight window
  }

  const originStop = stops[0];
  const destinationStop = stops[stops.length - 1];
  const lateNightCutoffMinutes = timeStringToMinutes(lateNightStartTime);

  const runs: TimetableRun[] = [];
  let currentMinutes = startMinutes;
  let runIdx = startRunNumber;

  while (currentMinutes <= endMinutes) {
    const isLateNight = Boolean(includeLateNightStabling) && currentMinutes >= lateNightCutoffMinutes;

    let runTripType: TripOperationalType = "REGULAR";
    let runDivergenceReason: DivergenceReason = "NONE";
    let runDivergenceDesc: string | undefined = undefined;
    let runTerminatedEarlyStopId: string | undefined = undefined;
    let runDestination = destinationStop.name;
    let runNotes = notes;
    let runServiceClass = serviceClass;

    if (isLateNight) {
      runTripType = "NIGHT_DEPOT_STABLING";
      runDivergenceReason = "DEPOT_PULL_IN";

      // Select stabling stop: user-selected or ~60% down the line
      const targetStablingStop =
        (stablingStopId && stops.find((s) => s.id === stablingStopId)) ||
        stops[Math.max(1, Math.floor(stops.length * 0.65))] ||
        stops[1];

      runTerminatedEarlyStopId = targetStablingStop.id;
      const targetName = stablingStopName || targetStablingStop.name;
      runDestination = `${targetName} (Masuk Dipo)`;
      runNotes = `Dinas Malam Masuk Dipo ${targetName} - Kereta Berakhir Lebih Awal`;
      runDivergenceDesc = `Perjalanan stabling/dinas masuk dipo di ${targetName}. Tidak melayani stasiun lanjutan.`;
      runServiceClass = "Dinas Malam Masuk Dipo";
    }

    const depTimeStr = minutesToTimeString(currentMinutes);
    const stopTimes = cascadeStopTimes(
      depTimeStr,
      stops,
      modeCategory,
      undefined,
      runTerminatedEarlyStopId
    );

    // Compute arrival time at final served stop
    const activeStopTimes = stopTimes.filter((st) => !st.isTerminatedEarly);
    const arrTimeStr = activeStopTimes[activeStopTimes.length - 1]?.arrivalTime || depTimeStr;

    const formattedRunNumber = runIdx.toString().padStart(3, "0");
    const tripCode = `${runCodePrefix}-${formattedRunNumber}`;

    runs.push({
      id: `run-batch-${lineId}-${tripCode}-${Date.now()}-${runIdx}`,
      lineId,
      tripCode,
      origin: originStop.name,
      destination: runDestination,
      departureTime: depTimeStr,
      arrivalTime: arrTimeStr,
      operatorName,
      serviceClass: runServiceClass,
      gateOrBay,
      notes: runNotes,
      daysOfWeek,
      stopTimes,
      tripType: runTripType,
      divergenceReason: runDivergenceReason,
      divergenceDescription: runDivergenceDesc,
      terminatedEarlyStopId: runTerminatedEarlyStopId,
    });

    currentMinutes += headwayMinutes;
    runIdx++;
  }

  return runs;
}

/**
 * Transforms a regular timetable run into an incident, maintenance, or detour divergence run (Rekayasa Pola Operasi).
 */
export function applyDivergenceToRun(
  run: TimetableRun,
  stops: Stop[],
  modeCategory: string,
  options: {
    tripType: TripOperationalType;
    divergenceReason: DivergenceReason;
    divergenceDescription: string;
    terminatedEarlyStopId?: string;
    divergedFromStopId?: string;
    newDestination?: string;
  }
): TimetableRun {
  const newStopTimes = cascadeStopTimes(
    run.departureTime,
    stops,
    modeCategory,
    run.stopTimes,
    options.terminatedEarlyStopId
  );

  const activeStops = newStopTimes.filter((st) => !st.isTerminatedEarly);
  const arrTime = activeStops[activeStops.length - 1]?.arrivalTime || run.arrivalTime;

  return {
    ...run,
    tripType: options.tripType,
    divergenceReason: options.divergenceReason,
    divergenceDescription: options.divergenceDescription,
    terminatedEarlyStopId: options.terminatedEarlyStopId,
    divergedFromStopId: options.divergedFromStopId,
    destination: options.newDestination || run.destination,
    arrivalTime: arrTime,
    stopTimes: newStopTimes,
    notes: options.divergenceDescription,
  };
}

/**
 * Shifts all arrival, departure, and stop-times of a run forward or backward by deltaMinutes.
 */
export function shiftRunSchedule(run: TimetableRun, deltaMinutes: number): TimetableRun {
  const newDepartureMinutes = timeStringToMinutes(run.departureTime) + deltaMinutes;
  const newArrivalMinutes = timeStringToMinutes(run.arrivalTime) + deltaMinutes;

  const shiftedStopTimes = run.stopTimes?.map((st) => ({
    ...st,
    arrivalTime: minutesToTimeString(timeStringToMinutes(st.arrivalTime) + deltaMinutes),
    departureTime: minutesToTimeString(timeStringToMinutes(st.departureTime) + deltaMinutes),
  }));

  return {
    ...run,
    departureTime: minutesToTimeString(newDepartureMinutes),
    arrivalTime: minutesToTimeString(newArrivalMinutes),
    stopTimes: shiftedStopTimes,
  };
}

export interface StopTimeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates stop time chronology to strictly prevent:
 * 1. Invalid time format (must match HH:mm).
 * 2. Negative dwell time (departure preceding arrival at the same stop).
 * 3. Backwards time travel against the preceding non-bypassed stop (arrival preceding previous stop's departure).
 * 4. Downstream chronological conflict if cascadeDownstream is disabled.
 */
export function validateStopTimeChronology(params: {
  arrivalTime: string;
  departureTime: string;
  isBypass?: boolean;
  stopIndex: number;
  allStopTimes: TimetableStopTime[];
  cascadeDownstream?: boolean;
}): StopTimeValidationResult {
  const {
    arrivalTime,
    departureTime,
    isBypass = false,
    stopIndex,
    allStopTimes,
    cascadeDownstream = false,
  } = params;

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(arrivalTime) || !timeRegex.test(departureTime)) {
    return {
      isValid: false,
      errorMessage: "Format waktu harus HH:mm (contoh: 08:30).",
    };
  }

  const arrM = timeStringToMinutes(arrivalTime);
  const depM = timeStringToMinutes(departureTime);

  // 1. Dwell validation (departure cannot precede arrival unless crossing midnight)
  if (!isBypass) {
    let dwell = depM - arrM;
    if (dwell < 0 && arrM > 22 * 60 && depM < 3 * 60) {
      dwell = depM + 1440 - arrM;
    }
    if (dwell < 0) {
      return {
        isValid: false,
        errorMessage: "Waktu keberangkatan tidak boleh mendahului kedatangan (dwell negatif).",
      };
    }
  }

  // 2. Preceding stop check (arrival cannot precede preceding stop departure)
  if (stopIndex > 0) {
    let prevStopTime: TimetableStopTime | undefined;
    for (let i = stopIndex - 1; i >= 0; i--) {
      const st = allStopTimes[i];
      if (st && !st.isBypass && !st.isTerminatedEarly) {
        prevStopTime = st;
        break;
      }
    }

    if (prevStopTime) {
      const prevDepM = timeStringToMinutes(prevStopTime.departureTime);
      let travelFromPrev = arrM - prevDepM;
      if (travelFromPrev < 0 && prevDepM > 22 * 60 && arrM < 3 * 60) {
        travelFromPrev = arrM + 1440 - prevDepM;
      }
      if (travelFromPrev < 0) {
        return {
          isValid: false,
          errorMessage: `Waktu kedatangan (${arrivalTime}) tidak boleh mendahului waktu keberangkatan stasiun sebelumnya (${prevStopTime.stopName || "sebelumnya"} - ${prevStopTime.departureTime}).`,
        };
      }
    }
  }

  // 3. Downstream stop check if NOT cascading (departure cannot exceed next stop arrival)
  if (!cascadeDownstream && stopIndex < allStopTimes.length - 1) {
    let nextStopTime: TimetableStopTime | undefined;
    for (let i = stopIndex + 1; i < allStopTimes.length; i++) {
      const st = allStopTimes[i];
      if (st && !st.isBypass && !st.isTerminatedEarly) {
        nextStopTime = st;
        break;
      }
    }

    if (nextStopTime) {
      const nextArrM = timeStringToMinutes(nextStopTime.arrivalTime);
      let travelToNext = nextArrM - depM;
      if (travelToNext < 0 && depM > 22 * 60 && nextArrM < 3 * 60) {
        travelToNext = nextArrM + 1440 - depM;
      }
      if (travelToNext < 0) {
        return {
          isValid: false,
          errorMessage: `Waktu keberangkatan (${departureTime}) tidak boleh mendahului waktu kedatangan stasiun berikutnya (${nextStopTime.stopName || "berikutnya"} - ${nextStopTime.arrivalTime}). Aktifkan 'Cascade times' untuk menyesuaikan downstream otomatis.`,
        };
      }
    }
  }

  return { isValid: true };
}

export interface PlatformConflict {
  stopId: string;
  stopName: string;
  peronOrTrack: string;
  runIdA: string;
  tripCodeA: string;
  runIdB: string;
  tripCodeB: string;
  timeA: string; // Arrival / Occupancy window
  timeB: string;
  overlapMinutes: number;
}

/**
 * Normalizes a platform string (e.g. "Peron 1", "peron 1", "Jalur 1") for conflict matching.
 */
export function normalizePlatformTrack(platform?: string): string {
  if (!platform) return "PERON 1";
  return platform.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Scans all materialized runs across a line to detect simultaneous platform/track occupancy conflicts.
 * Two trips conflict at a stop if:
 * 1. They are assigned to the exact same platform or track (case-insensitive normalized).
 * 2. Neither is bypassed nor terminated before this stop.
 * 3. Their station occupancy intervals [Arr, Dep] overlap, or have less than minHeadwayMinutes buffer (default 2 mins).
 */
export function detectPlatformConflicts(
  runs: TimetableRun[],
  stops: Stop[],
  minHeadwayMinutes = 2
): Map<string, PlatformConflict[]> {
  // Key: `${stopId}::${runId}` -> Array of conflicts involving this run at this stop
  const conflictMap = new Map<string, PlatformConflict[]>();

  // Map each stop to all train occupancies at that stop
  for (const stop of stops) {
    interface Occupancy {
      runId: string;
      tripCode: string;
      peronOrTrack: string;
      arrMinutes: number;
      depMinutes: number;
      arrStr: string;
      depStr: string;
    }

    const occupancies: Occupancy[] = [];

    for (const run of runs) {
      if (!run.stopTimes) continue;
      const st = run.stopTimes.find((s) => s.stopId === stop.id);
      if (!st || st.isBypass || st.isTerminatedEarly) continue;

      let arrM = timeStringToMinutes(st.arrivalTime);
      let depM = timeStringToMinutes(st.departureTime);

      // Handle midnight crossing
      if (depM < arrM && arrM > 22 * 60 && depM < 3 * 60) {
        depM += 1440;
      }

      occupancies.push({
        runId: run.id,
        tripCode: run.tripCode,
        peronOrTrack: normalizePlatformTrack(st.peronOrTrack),
        arrMinutes: arrM,
        depMinutes: depM,
        arrStr: st.arrivalTime,
        depStr: st.departureTime,
      });
    }

    // Compare pairwise occupancies for same platform and headway collision
    for (let i = 0; i < occupancies.length; i++) {
      for (let j = i + 1; j < occupancies.length; j++) {
        const occA = occupancies[i];
        const occB = occupancies[j];

        if (occA.peronOrTrack === occB.peronOrTrack) {
          // Check temporal overlap: [arrA - buffer, depA + buffer] overlaps [arrB, depB]
          const startA = occA.arrMinutes - minHeadwayMinutes;
          const endA = occA.depMinutes + minHeadwayMinutes;
          const startB = occB.arrMinutes;
          const endB = occB.depMinutes;

          const isOverlapping = Math.max(startA, startB) <= Math.min(endA, endB);

          if (isOverlapping) {
            const overlapM = Math.abs(occA.arrMinutes - occB.arrMinutes);
            const conflictA: PlatformConflict = {
              stopId: stop.id,
              stopName: stop.name,
              peronOrTrack: occA.peronOrTrack,
              runIdA: occA.runId,
              tripCodeA: occA.tripCode,
              runIdB: occB.runId,
              tripCodeB: occB.tripCode,
              timeA: `${occA.arrStr}-${occA.depStr}`,
              timeB: `${occB.arrStr}-${occB.depStr}`,
              overlapMinutes: overlapM,
            };

            const keyA = `${stop.id}::${occA.runId}`;
            const keyB = `${stop.id}::${occB.runId}`;

            const listA = conflictMap.get(keyA) || [];
            listA.push(conflictA);
            conflictMap.set(keyA, listA);

            const listB = conflictMap.get(keyB) || [];
            listB.push({
              ...conflictA,
              runIdA: occB.runId,
              tripCodeA: occB.tripCode,
              runIdB: occA.runId,
              tripCodeB: occA.tripCode,
              timeA: `${occB.arrStr}-${occB.depStr}`,
              timeB: `${occA.arrStr}-${occA.depStr}`,
            });
            conflictMap.set(keyB, listB);
          }
        }
      }
    }
  }

  return conflictMap;
}

/**
 * Checks whether an updated stop time for a specific run causes a platform/track conflict
 * against other existing runs on the line.
 */
export function checkPlatformOccupancyConflict(params: {
  targetRunId: string;
  stopId: string;
  stopName: string;
  peronOrTrack: string;
  arrivalTime: string;
  departureTime: string;
  isBypass: boolean;
  allRuns: TimetableRun[];
  minHeadwayMinutes?: number;
}): { hasConflict: boolean; conflictingTripCode?: string; conflictingWindow?: string; warningMessage?: string } {
  const {
    targetRunId,
    stopId,
    stopName,
    peronOrTrack,
    arrivalTime,
    departureTime,
    isBypass,
    allRuns,
    minHeadwayMinutes = 2,
  } = params;

  if (isBypass) return { hasConflict: false };

  const normPlatform = normalizePlatformTrack(peronOrTrack);
  const arrM = timeStringToMinutes(arrivalTime);
  let depM = timeStringToMinutes(departureTime);
  if (depM < arrM && arrM > 22 * 60 && depM < 3 * 60) {
    depM += 1440;
  }

  const startA = arrM - minHeadwayMinutes;
  const endA = depM + minHeadwayMinutes;

  for (const otherRun of allRuns) {
    if (otherRun.id === targetRunId || !otherRun.stopTimes) continue;

    const otherSt = otherRun.stopTimes.find((s) => s.stopId === stopId);
    if (!otherSt || otherSt.isBypass || otherSt.isTerminatedEarly) continue;

    if (normalizePlatformTrack(otherSt.peronOrTrack) === normPlatform) {
      let otherArrM = timeStringToMinutes(otherSt.arrivalTime);
      let otherDepM = timeStringToMinutes(otherSt.departureTime);
      if (otherDepM < otherArrM && otherArrM > 22 * 60 && otherDepM < 3 * 60) {
        otherDepM += 1440;
      }

      const isOverlapping = Math.max(startA, otherArrM) <= Math.min(endA, otherDepM);

      if (isOverlapping) {
        return {
          hasConflict: true,
          conflictingTripCode: otherRun.tripCode,
          conflictingWindow: `${otherSt.arrivalTime} - ${otherSt.departureTime}`,
          warningMessage: `Peringatan Konflik Interlocking: ${normPlatform} di ${stopName} sudah dialokasikan untuk ${otherRun.tripCode} (${otherSt.arrivalTime} - ${otherSt.departureTime}) dalam toleransi ${minHeadwayMinutes} menit.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

export type CorridorDirection = "OUTBOUND" | "INBOUND";

/**
 * Returns line stops ordered according to corridor direction:
 * - OUTBOUND (Arah Hilir / Departure): original sequence (Stop 1 -> Stop N)
 * - INBOUND (Arah Mudik / Return): reversed sequence (Stop N -> Stop 1)
 */
export function getOrderedLineStops(stops: Stop[], direction: CorridorDirection = "OUTBOUND"): Stop[] {
  if (!stops || stops.length <= 1) return stops;
  if (direction === "INBOUND") {
    return [...stops].reverse();
  }
  return [...stops];
}

/**
 * Computes boundary-safe placement alignment for in-cell matrix popovers:
 * - Vertical: pops upward near bottom rows (when safe from colliding with header), downward otherwise.
 * - Horizontal: flushes left on column 0, flushes right on final columns, centers on intermediate columns.
 */
export function getMatrixPopoverPlacement(params: {
  stopIdx: number;
  totalStops: number;
  runIdx: number;
  totalRuns: number;
}): {
  vertical: "TOP" | "BOTTOM";
  horizontal: "LEFT" | "CENTER" | "RIGHT";
} {
  const isUpward = params.totalStops > 2 && params.stopIdx >= Math.max(2, params.totalStops - 2);
  const horizontal =
    params.runIdx === 0
      ? "LEFT"
      : params.runIdx >= Math.max(1, params.totalRuns - 2)
      ? "RIGHT"
      : "CENTER";

  return {
    vertical: isUpward ? "TOP" : "BOTTOM",
    horizontal,
  };
}


