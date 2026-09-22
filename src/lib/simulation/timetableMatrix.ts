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
  direction?: "OUTBOUND" | "INBOUND" | "BOTH";
  asymmetricInboundHeadwayMinutes?: number;
}

/**
 * Internal generator for a single direction of travel.
 */
function generateSingleDirectionBatch(params: {
  config: BatchScheduleConfig;
  targetDirection: "OUTBOUND" | "INBOUND";
  headway: number;
  startRunNum: number;
  stepRunNum: number;
}): TimetableRun[] {
  const { config, targetDirection, headway, startRunNum, stepRunNum } = params;
  const {
    lineId,
    operatorName,
    stops,
    modeCategory,
    startTime,
    endTime,
    runCodePrefix,
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

  // Determine active stops order based on target direction
  const effectiveStops = targetDirection === "INBOUND" ? [...stops].reverse() : stops;

  const startMinutes = timeStringToMinutes(startTime);
  let endMinutes = timeStringToMinutes(endTime);
  if (endMinutes < startMinutes) {
    endMinutes += 1440; // overnight window
  }

  const originStop = effectiveStops[0];
  const destinationStop = effectiveStops[effectiveStops.length - 1];
  const lateNightCutoffMinutes = timeStringToMinutes(lateNightStartTime);

  const runs: TimetableRun[] = [];
  let currentMinutes = startMinutes;
  let runIdx = startRunNum;

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
        (stablingStopId && effectiveStops.find((s) => s.id === stablingStopId)) ||
        effectiveStops[Math.max(1, Math.floor(effectiveStops.length * 0.65))] ||
        effectiveStops[1];

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
      effectiveStops,
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
      direction: targetDirection,
    });

    currentMinutes += headway;
    runIdx += stepRunNum;
  }

  return runs;
}

/**
 * Generates an entire sequence of timetable runs based on an operational headway frequency pattern,
 * with authentic support for bi-directional corridors, asymmetric headways, and late-night depot stabling.
 */
export function generateBatchTimetableRuns(config: BatchScheduleConfig): TimetableRun[] {
  const {
    direction = "OUTBOUND",
    headwayMinutes,
    asymmetricInboundHeadwayMinutes,
    startRunNumber = 101,
  } = config;

  if (direction === "OUTBOUND") {
    return generateSingleDirectionBatch({
      config,
      targetDirection: "OUTBOUND",
      headway: headwayMinutes,
      startRunNum: startRunNumber,
      stepRunNum: 1,
    });
  }

  if (direction === "INBOUND") {
    return generateSingleDirectionBatch({
      config,
      targetDirection: "INBOUND",
      headway: headwayMinutes,
      startRunNum: startRunNumber,
      stepRunNum: 1,
    });
  }

  // BOTH directions with asymmetric headways
  const inboundHeadway = asymmetricInboundHeadwayMinutes ?? headwayMinutes;

  // Authentic railway numbering: Odd numbers for Outbound (down), Even for Inbound (up)
  const outboundStart = startRunNumber % 2 === 1 ? startRunNumber : startRunNumber + 1;
  const inboundStart = startRunNumber % 2 === 0 ? startRunNumber : startRunNumber + 1;

  const outboundRuns = generateSingleDirectionBatch({
    config,
    targetDirection: "OUTBOUND",
    headway: headwayMinutes,
    startRunNum: outboundStart,
    stepRunNum: 2,
  });

  const inboundRuns = generateSingleDirectionBatch({
    config,
    targetDirection: "INBOUND",
    headway: inboundHeadway,
    startRunNum: inboundStart,
    stepRunNum: 2,
  });

  // Merge and sort chronologically by departure time
  return [...outboundRuns, ...inboundRuns].sort(
    (a, b) => timeStringToMinutes(a.departureTime) - timeStringToMinutes(b.departureTime)
  );
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
 * Accurately determines a run's corridor direction (Arah Hilir vs Arah Mudik):
 * - If run.direction is explicitly stored, returns it.
 * - Otherwise inspects stopTimes or origin/destination matching against line stops.
 */
export function determineRunDirection(run: TimetableRun, lineStops: Stop[]): CorridorDirection {
  if (run.direction) {
    return run.direction;
  }
  if (!lineStops || lineStops.length < 2) return "OUTBOUND";

  const originTerminus = lineStops[0];
  const finalTerminus = lineStops[lineStops.length - 1];

  // 1. Check stopTimes if populated
  if (run.stopTimes && run.stopTimes.length > 0) {
    const firstNonBypass =
      run.stopTimes.find((s) => !s.isBypass && !s.isTerminatedEarly) || run.stopTimes[0];
    const lastNonBypass =
      [...run.stopTimes].reverse().find((s) => !s.isBypass && !s.isTerminatedEarly) ||
      run.stopTimes[run.stopTimes.length - 1];

    if (firstNonBypass.stopId === finalTerminus.id || lastNonBypass.stopId === originTerminus.id) {
      return "INBOUND";
    }
    if (firstNonBypass.stopId === originTerminus.id || lastNonBypass.stopId === finalTerminus.id) {
      return "OUTBOUND";
    }
  }

  // 2. Check origin / destination string
  if (run.origin === finalTerminus.name || run.destination === originTerminus.name) {
    return "INBOUND";
  }

  return "OUTBOUND";
}

export interface CorridorHeadwayStats {
  outboundCount: number;
  inboundCount: number;
  averageHeadwayOutboundMinutes: number | null;
  averageHeadwayInboundMinutes: number | null;
  isAsymmetric: boolean; // true if difference between outbound and inbound headway >= 1.5 mins
  minHeadwayOutboundMinutes: number | null;
  minHeadwayInboundMinutes: number | null;
}

/**
 * Computes bi-directional headway metrics and detects directional asymmetry across corridor runs.
 */
export function computeCorridorHeadwayStats(
  runs: TimetableRun[],
  lineStops: Stop[]
): CorridorHeadwayStats {
  const outboundRuns: TimetableRun[] = [];
  const inboundRuns: TimetableRun[] = [];

  for (const r of runs) {
    const dir = determineRunDirection(r, lineStops);
    if (dir === "OUTBOUND") {
      outboundRuns.push(r);
    } else {
      inboundRuns.push(r);
    }
  }

  const computeStats = (list: TimetableRun[]) => {
    if (list.length < 2) {
      return { avg: null, min: null };
    }
    const sorted = [...list].sort(
      (a, b) => timeStringToMinutes(a.departureTime) - timeStringToMinutes(b.departureTime)
    );
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = timeStringToMinutes(sorted[i - 1].departureTime);
      let curr = timeStringToMinutes(sorted[i].departureTime);
      if (curr < prev && prev > 20 * 60) curr += 1440;
      const diff = curr - prev;
      if (diff > 0 && diff <= 180) {
        intervals.push(diff);
      }
    }
    if (intervals.length === 0) return { avg: null, min: null };
    const avg = Math.round((intervals.reduce((a, b) => a + b, 0) / intervals.length) * 10) / 10;
    const min = Math.min(...intervals);
    return { avg, min };
  };

  const ob = computeStats(outboundRuns);
  const ib = computeStats(inboundRuns);

  const isAsymmetric =
    ob.avg !== null &&
    ib.avg !== null &&
    Math.abs(ob.avg - ib.avg) >= 1.5;

  return {
    outboundCount: outboundRuns.length,
    inboundCount: inboundRuns.length,
    averageHeadwayOutboundMinutes: ob.avg,
    averageHeadwayInboundMinutes: ib.avg,
    isAsymmetric,
    minHeadwayOutboundMinutes: ob.min,
    minHeadwayInboundMinutes: ib.min,
  };
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

export interface StationDistance {
  stopId: string;
  stopName: string;
  code: string;
  distanceKm: number;
  cumulativeKm: number;
  fraction: number; // 0 (origin) to 1 (terminus)
  sequence: number;
  isInterchange: boolean;
  stationType?: string;
}

/**
 * Computes progressive and cumulative distances along sequential line stops.
 * Supports both Geographic Haversine Distance (KM) and Uniform Station Intervals.
 */
export function computeStationDistances(
  stops: Stop[],
  useRealDistance: boolean = true
): StationDistance[] {
  if (!stops || stops.length === 0) return [];

  const distances: StationDistance[] = [];
  let runningKm = 0;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    let legKm = 0;
    if (i > 0) {
      legKm = calculateDistanceKm(
        { latitude: stops[i - 1].latitude, longitude: stops[i - 1].longitude },
        { latitude: stop.latitude, longitude: stop.longitude }
      );
      runningKm += legKm;
    }

    distances.push({
      stopId: stop.id,
      stopName: stop.name,
      code: stop.code || `S${i + 1}`,
      distanceKm: Math.round(legKm * 100) / 100,
      cumulativeKm: Math.round(runningKm * 100) / 100,
      fraction: 0,
      sequence: stop.sequence || i + 1,
      isInterchange: stop.isInterchange ?? false,
      stationType: stop.stationType,
    });
  }

  const totalKm = distances[distances.length - 1]?.cumulativeKm || runningKm;
  for (let i = 0; i < distances.length; i++) {
    if (i === 0) {
      distances[i].fraction = 0;
    } else if (i === distances.length - 1) {
      distances[i].fraction = 1.0;
    } else if (useRealDistance && totalKm > 0.05) {
      distances[i].fraction = distances[i].cumulativeKm / totalKm;
    } else {
      distances[i].fraction = stops.length > 1 ? i / (stops.length - 1) : 0;
    }
  }

  return distances;
}

export interface StringlineVertex {
  timeMinutes: number;
  fraction: number;
  stopId: string;
  stopName: string;
  timeString: string;
  isDwellEnd?: boolean;
}

export type StringlineLineStyle = "SOLID" | "DASHED_INDIGO" | "DASHED_ROSE" | "AMBER" | "GOLD";

export interface StringlineTrajectory {
  runId: string;
  tripCode: string;
  run: TimetableRun;
  direction: "OUTBOUND" | "INBOUND";
  vertices: StringlineVertex[];
  startTimeMinutes: number;
  endTimeMinutes: number;
  color: string;
  lineStyle: StringlineLineStyle;
  originName: string;
  destinationName: string;
  averageSpeedKmh: number;
  totalDurationMinutes: number;
}

/**
 * Computes vertices for a single run along the station distance axis.
 * Captures station dwell periods as horizontal flat plateaus and running sections as diagonal slopes.
 */
export function computeRunStringlineTrajectory(params: {
  run: TimetableRun;
  stops: Stop[];
  distances: StationDistance[];
  lineColor?: string;
}): StringlineTrajectory | null {
  const { run, stops, distances, lineColor = "#14b8a6" } = params;
  if (!stops || stops.length === 0 || !distances || distances.length === 0) return null;

  // Determine direction: Outbound (Origin -> Terminus) vs Inbound (Terminus -> Origin)
  const direction: "OUTBOUND" | "INBOUND" = determineRunDirection(run, stops);

  const effectiveStops = direction === "INBOUND" ? [...stops].reverse() : stops;
  const vertices: StringlineVertex[] = [];

  let previousDepMinutes = -1;

  for (let i = 0; i < effectiveStops.length; i++) {
    const stop = effectiveStops[i];
    const distInfo = distances.find((d) => d.stopId === stop.id);
    if (!distInfo) continue;

    const stopTime = run.stopTimes?.find((st) => st.stopId === stop.id);
    if (stopTime?.isTerminatedEarly) {
      break;
    }

    const arrStr = stopTime?.arrivalTime || (i === 0 ? run.departureTime : run.arrivalTime);
    const depStr =
      stopTime?.departureTime || (i === effectiveStops.length - 1 ? run.arrivalTime : run.departureTime);

    let arrMinutes = timeStringToMinutes(arrStr);
    let depMinutes = timeStringToMinutes(depStr);

    // Midnight crossing adjustment
    if (previousDepMinutes > 0 && arrMinutes < previousDepMinutes && previousDepMinutes > 20 * 60) {
      arrMinutes += 1440;
    }
    if (depMinutes < arrMinutes && arrMinutes > 20 * 60) {
      depMinutes += 1440;
    }

    const isOrigin = i === 0;
    const isTerminus = i === effectiveStops.length - 1;

    if (isOrigin) {
      vertices.push({
        timeMinutes: depMinutes,
        fraction: distInfo.fraction,
        stopId: stop.id,
        stopName: stop.name,
        timeString: depStr,
      });
      previousDepMinutes = depMinutes;
    } else if (isTerminus) {
      vertices.push({
        timeMinutes: arrMinutes,
        fraction: distInfo.fraction,
        stopId: stop.id,
        stopName: stop.name,
        timeString: arrStr,
      });
      previousDepMinutes = arrMinutes;
    } else {
      // Intermediate station with dwell
      if (arrMinutes !== depMinutes && !stopTime?.isBypass) {
        vertices.push({
          timeMinutes: arrMinutes,
          fraction: distInfo.fraction,
          stopId: stop.id,
          stopName: stop.name,
          timeString: arrStr,
        });
        vertices.push({
          timeMinutes: depMinutes,
          fraction: distInfo.fraction,
          stopId: stop.id,
          stopName: stop.name,
          timeString: depStr,
          isDwellEnd: true,
        });
      } else {
        // Express non-stop pass or instant departure
        vertices.push({
          timeMinutes: depMinutes,
          fraction: distInfo.fraction,
          stopId: stop.id,
          stopName: stop.name,
          timeString: depStr,
        });
      }
      previousDepMinutes = depMinutes;
    }
  }

  if (vertices.length < 2) return null;

  const startTimeMinutes = vertices[0].timeMinutes;
  const endTimeMinutes = vertices[vertices.length - 1].timeMinutes;
  const totalDurationMinutes = Math.max(1, endTimeMinutes - startTimeMinutes);

  const totalDistKm = distances[distances.length - 1]?.cumulativeKm || 10;
  const averageSpeedKmh = Math.round((totalDistKm / (totalDurationMinutes / 60)) * 10) / 10;

  // Determine line style and accent color
  let lineStyle: StringlineLineStyle = "SOLID";
  let color = lineColor;

  if (run.tripType === "NIGHT_DEPOT_STABLING") {
    lineStyle = "DASHED_INDIGO";
    color = "#818cf8";
  } else if (run.tripType === "ROUTE_DIVERGENCE") {
    lineStyle = "DASHED_ROSE";
    color = "#fb7185";
  } else if (run.tripType === "SHORT_TURN") {
    lineStyle = "AMBER";
    color = "#fbbf24";
  } else if (run.tripType === "SPECIAL_KLB") {
    lineStyle = "GOLD";
    color = "#facc15";
  }

  return {
    runId: run.id,
    tripCode: run.tripCode,
    run,
    direction,
    vertices,
    startTimeMinutes,
    endTimeMinutes,
    color,
    lineStyle,
    originName: run.origin,
    destinationName: run.destination,
    averageSpeedKmh,
    totalDurationMinutes,
  };
}

export interface TrajectoryIntersection {
  id: string;
  type: "OVERTAKE" | "CROSSING_MEET";
  runA: TimetableRun;
  runB: TimetableRun;
  timeMinutes: number;
  timeString: string;
  fraction: number;
  approxKm: number;
  approxLocationDescription: string;
}

/**
 * Detects trajectory line crossings between trains:
 * - Opposite directions: Crossing Meet (Persilangan Kereta Api)
 * - Same direction: Overtake (Penyusulan Kereta Api)
 */
export function detectTrajectoryIntersections(
  trajectories: StringlineTrajectory[],
  distances: StationDistance[]
): TrajectoryIntersection[] {
  if (!trajectories || trajectories.length < 2) return [];

  const intersections: TrajectoryIntersection[] = [];
  const maxKm = distances[distances.length - 1]?.cumulativeKm || 1;

  for (let a = 0; a < trajectories.length; a++) {
    const trajA = trajectories[a];
    for (let b = a + 1; b < trajectories.length; b++) {
      const trajB = trajectories[b];

      // Quick bounding box prune on time
      if (
        trajA.endTimeMinutes < trajB.startTimeMinutes ||
        trajB.endTimeMinutes < trajA.startTimeMinutes
      ) {
        continue;
      }

      // Test segment pairs
      for (let i = 0; i < trajA.vertices.length - 1; i++) {
        const p1 = trajA.vertices[i];
        const p2 = trajA.vertices[i + 1];
        const isADwell = Math.abs(p1.fraction - p2.fraction) < 1e-6;

        for (let j = 0; j < trajB.vertices.length - 1; j++) {
          const p3 = trajB.vertices[j];
          const p4 = trajB.vertices[j + 1];
          const isBDwell = Math.abs(p3.fraction - p4.fraction) < 1e-6;

          if (isADwell && isBDwell) continue;

          // Case 1: Traj A is dwelling at station while Traj B passes through
          if (isADwell && !isBDwell) {
            const yStation = p1.fraction;
            const minY_B = Math.min(p3.fraction, p4.fraction);
            const maxY_B = Math.max(p3.fraction, p4.fraction);
            if (yStation >= minY_B && yStation <= maxY_B && Math.abs(p4.fraction - p3.fraction) > 1e-6) {
              const fracB = (yStation - p3.fraction) / (p4.fraction - p3.fraction);
              const timeBAtStation = p3.timeMinutes + fracB * (p4.timeMinutes - p3.timeMinutes);
              const minA = Math.min(p1.timeMinutes, p2.timeMinutes);
              const maxA = Math.max(p1.timeMinutes, p2.timeMinutes);
              if (timeBAtStation >= minA && timeBAtStation <= maxA) {
                const timeCross = Math.round(timeBAtStation);
                const isSameDir = trajA.direction === trajB.direction;
                intersections.push({
                  id: `cross-${trajA.runId}-${trajB.runId}-${timeCross}`,
                  type: isSameDir ? "OVERTAKE" : "CROSSING_MEET",
                  runA: trajA.run,
                  runB: trajB.run,
                  timeMinutes: timeCross,
                  timeString: minutesToTimeString(timeCross),
                  fraction: yStation,
                  approxKm: Math.round(yStation * maxKm * 10) / 10,
                  approxLocationDescription: p1.stopName,
                });
              }
            }
            continue;
          }

          // Case 2: Traj B is dwelling at station while Traj A passes through
          if (isBDwell && !isADwell) {
            const yStation = p3.fraction;
            const minY_A = Math.min(p1.fraction, p2.fraction);
            const maxY_A = Math.max(p1.fraction, p2.fraction);
            if (yStation >= minY_A && yStation <= maxY_A && Math.abs(p2.fraction - p1.fraction) > 1e-6) {
              const fracA = (yStation - p1.fraction) / (p2.fraction - p1.fraction);
              const timeAAtStation = p1.timeMinutes + fracA * (p2.timeMinutes - p1.timeMinutes);
              const minB = Math.min(p3.timeMinutes, p4.timeMinutes);
              const maxB = Math.max(p3.timeMinutes, p4.timeMinutes);
              if (timeAAtStation >= minB && timeAAtStation <= maxB) {
                const timeCross = Math.round(timeAAtStation);
                const isSameDir = trajA.direction === trajB.direction;
                intersections.push({
                  id: `cross-${trajA.runId}-${trajB.runId}-${timeCross}`,
                  type: isSameDir ? "OVERTAKE" : "CROSSING_MEET",
                  runA: trajA.run,
                  runB: trajB.run,
                  timeMinutes: timeCross,
                  timeString: minutesToTimeString(timeCross),
                  fraction: yStation,
                  approxKm: Math.round(yStation * maxKm * 10) / 10,
                  approxLocationDescription: p3.stopName,
                });
              }
            }
            continue;
          }

          // Case 3: Both are running track segments
          const minA = Math.min(p1.timeMinutes, p2.timeMinutes);
          const maxA = Math.max(p1.timeMinutes, p2.timeMinutes);
          const minB = Math.min(p3.timeMinutes, p4.timeMinutes);
          const maxB = Math.max(p3.timeMinutes, p4.timeMinutes);
          if (maxA < minB || maxB < minA) continue;

          const x1 = p1.timeMinutes;
          const y1 = p1.fraction;
          const x2 = p2.timeMinutes;
          const y2 = p2.fraction;

          const x3 = p3.timeMinutes;
          const y3 = p3.fraction;
          const x4 = p4.timeMinutes;
          const y4 = p4.fraction;

          const dxA = x2 - x1;
          const dyA = y2 - y1;
          const dxB = x4 - x3;
          const dyB = y4 - y3;

          const det = -dxA * dyB + dxB * dyA;
          if (Math.abs(det) < 1e-6) continue;

          const dxStart = x3 - x1;
          const dyStart = y3 - y1;

          const ta = (-dxStart * dyB + dyStart * dxB) / det;
          const tb = (dxA * dyStart - dyA * dxStart) / det;

          if (ta >= 0.001 && ta <= 0.999 && tb >= 0.001 && tb <= 0.999) {
            const timeCross = Math.round(x1 + ta * dxA);
            const fracCross = y1 + ta * dyA;
            const kmCross = Math.round(fracCross * maxKm * 10) / 10;

            // Find closest bounding stations
            let stBefore = distances[0]?.stopName || "Stasiun Awal";
            let stAfter = distances[distances.length - 1]?.stopName || "Stasiun Akhir";
            for (let k = 0; k < distances.length - 1; k++) {
              if (distances[k].fraction <= fracCross && distances[k + 1].fraction >= fracCross) {
                stBefore = distances[k].stopName;
                stAfter = distances[k + 1].stopName;
                break;
              }
            }

            const isSameDir = trajA.direction === trajB.direction;
            const type = isSameDir ? "OVERTAKE" : "CROSSING_MEET";

            intersections.push({
              id: `cross-${trajA.runId}-${trajB.runId}-${timeCross}`,
              type,
              runA: trajA.run,
              runB: trajB.run,
              timeMinutes: timeCross,
              timeString: minutesToTimeString(timeCross),
              fraction: fracCross,
              approxKm: kmCross,
              approxLocationDescription:
                stBefore === stAfter ? stBefore : `Antara ${stBefore} - ${stAfter}`,
            });
          }
        }
      }
    }
  }

  return intersections;
}



