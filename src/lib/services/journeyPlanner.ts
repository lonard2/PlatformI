/**
 * PlatformI - Multimodal Deterministic Journey Planning Engine
 *
 * Provides immediate, deterministic route binding between origin and destination stops:
 * - Pinpoints origin and destination coordinates
 * - Resolves direct lines serving both stations
 * - Detects 1-transfer interchange routes via connecting transit hubs
 * - Computes Haversine distance, estimated travel time, and integrated JakLingko fares
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { Stop, Line } from "@/types/transit";
import { haversineDistance } from "@/lib/math/geodesy";
import { calculateLegFare } from "@/lib/services/fareCalculator";
import { PlannedJourney } from "@/lib/stores/useTransitStore";

/**
 * Normalizes and finds a matching stop from user input, handling common prefixes like
 * 'Stasiun', 'Halte', 'Terminal', 'Pelabuhan', 'Bandara'.
 */
export function findMatchingStop(input: string, allStops: Stop[]): Stop | null {
  const norm = input.trim().toLowerCase();
  if (!norm) return null;

  // 1. Exact match
  const exact = allStops.find((s) => s.name.trim().toLowerCase() === norm);
  if (exact) return exact;

  // 2. Strip common transit stop prefixes
  const stripPrefix = (str: string) =>
    str.replace(/^(stasiun|halte|pelabuhan|bandara|terminal)\s+/i, "").trim().toLowerCase();

  const normStripped = stripPrefix(norm);
  const strippedMatch = allStops.find((s) => stripPrefix(s.name) === normStripped);
  if (strippedMatch) return strippedMatch;

  // 3. Substring inclusion match — commuters type partial names ("Stasiun
  //    Halim" for "Stasiun Kereta Cepat Halim"). The result card echoes the
  //    resolved stop names, so a wrong substring match is visible, not silent.
  const subMatch = allStops.find(
    (s) => s.name.toLowerCase().includes(normStripped) || normStripped.includes(stripPrefix(s.name))
  );
  if (subMatch) return subMatch;

  return null;
}

/**
 * Truth contract: a planned journey only counts as a route when the planner
 * found candidate lines. A no-route result still carries the resolved stops so
 * the UI can name them, but it must not claim an ETA, a fare, or a plotted route.
 */
export function journeyHasRoute(journey: PlannedJourney | null): boolean {
  return !!journey && journey.candidateLines.length > 0;
}

/**
 * Ranked stop suggestion for the journey combobox. One entry per station name
 * so Halim-type collisions resolve to a visible, tappable list instead of a
 * silent substring pick. Prefix matches outrank substring matches.
 */
export interface StopSuggestion {
  name: string;
  lineCode: string;
  lineColorHex: string;
}

export function getStopSuggestions(
  query: string,
  allStops: Stop[],
  allLines: Line[],
  limit = 6
): StopSuggestion[] {
  const norm = query.trim().toLowerCase();
  if (!norm) return [];
  const knownLineIds = new Set(allLines.map((l) => l.id));
  const byName = new Map<string, Stop>();
  for (const s of allStops) {
    if (!knownLineIds.has(s.lineId)) continue;
    if (!byName.has(s.name)) byName.set(s.name, s);
  }
  const starts: Stop[] = [];
  const contains: Stop[] = [];
  for (const s of byName.values()) {
    const n = s.name.toLowerCase();
    if (n.startsWith(norm)) starts.push(s);
    else if (n.includes(norm)) contains.push(s);
  }
  const ranked = [...starts, ...contains].slice(0, limit);
  const lineById = new Map(allLines.map((l) => [l.id, l]));
  return ranked.map((s) => ({
    name: s.name,
    lineCode: lineById.get(s.lineId)?.code ?? "",
    lineColorHex: lineById.get(s.lineId)?.colorHex ?? "#38bdf8",
  }));
}

/**
 * Resolves planned journey deterministically from user-entered stop names.
 */
export function resolvePlannedJourney(
  originName: string,
  destName: string,
  allStops: Stop[],
  allLines: Line[]
): PlannedJourney | null {
  const normOrigin = originName.trim().toLowerCase();
  const normDest = destName.trim().toLowerCase();

  if (!normOrigin || !normDest || normOrigin === normDest) {
    return null;
  }

  const originStop = findMatchingStop(originName, allStops);
  const destStop = findMatchingStop(destName, allStops);

  if (!originStop || !destStop || originStop.id === destStop.id) {
    return null;
  }

  // Find all stop records corresponding to these stations (e.g. multi-modal complexes)
  const originStops = allStops.filter(
    (s) => s.id === originStop.id || s.name.trim().toLowerCase() === originStop.name.trim().toLowerCase()
  );
  const destStops = allStops.filter(
    (s) => s.id === destStop.id || s.name.trim().toLowerCase() === destStop.name.trim().toLowerCase()
  );

  // 1. Direct Lines: lines where stops serve both origin and destination
  const directLines = allLines.filter((line) => {
    const lineStops = allStops.filter((s) => s.lineId === line.id);
    const servesOrigin = lineStops.some((s) =>
      originStops.some((os) => os.id === s.id || os.name.toLowerCase() === s.name.toLowerCase())
    );
    const servesDest = lineStops.some((s) =>
      destStops.some((ds) => ds.id === s.id || ds.name.toLowerCase() === s.name.toLowerCase())
    );
    return servesOrigin && servesDest;
  });

  const distanceKm =
    haversineDistance(
      [originStop.latitude, originStop.longitude],
      [destStop.latitude, destStop.longitude]
    ) / 1000;

  // If direct lines exist, compute single-mode direct journey
  if (directLines.length > 0) {
    const primaryLine = directLines[0];
    const estimatedFareRp = calculateLegFare(primaryLine.mode, distanceKm);
    const estimatedDurationMinutes = Math.max(
      4,
      Math.round(distanceKm * 2.4 + 3)
    );

    return {
      originStop,
      destinationStop: destStop,
      directLines,
      candidateLines: directLines,
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedFareRp,
      estimatedDurationMinutes,
    };
  }

  // 2. Transfer Option: Find common interchange stop between candidate lines
  const originLineIds = new Set(
    originStops
      .map((s) => s.lineId)
      .concat(originStop.connectedLineIds || [])
  );
  const destLineIds = new Set(
    destStops
      .map((s) => s.lineId)
      .concat(destStop.connectedLineIds || [])
  );

  const candidateOriginLines = allLines.filter((l) => originLineIds.has(l.id));
  const candidateDestLines = allLines.filter((l) => destLineIds.has(l.id));

  let transferOption: PlannedJourney["transferOption"] | undefined = undefined;

  for (const oLine of candidateOriginLines) {
    const oStops = allStops.filter((s) => s.lineId === oLine.id);
    for (const dLine of candidateDestLines) {
      if (oLine.id === dLine.id) continue;
      const dStops = allStops.filter((s) => s.lineId === dLine.id);

      // Find intersection stop by name, code, or connectedLineIds
      const commonStop = oStops.find((os) =>
        dStops.some(
          (ds) =>
            ds.name.trim().toLowerCase() === os.name.trim().toLowerCase() ||
            (os.connectedLineIds && os.connectedLineIds.includes(dLine.id)) ||
            (ds.connectedLineIds && ds.connectedLineIds.includes(oLine.id))
        )
      );

      if (commonStop) {
        transferOption = {
          firstLine: oLine,
          secondLine: dLine,
          transferStop: commonStop,
        };
        break;
      }
    }
    if (transferOption) break;
  }

  if (transferOption) {
    const candidateLines = [transferOption.firstLine, transferOption.secondLine];
    const firstMode = candidateLines[0]?.mode || "tj_brt";
    const secondMode = candidateLines[1]?.mode || firstMode;
    const fare1 = calculateLegFare(firstMode, distanceKm * 0.5);
    const fare2 = calculateLegFare(secondMode, distanceKm * 0.5);
    // JakLingko 3-hour tariff cap: Rp 10,000 max integrated ceiling
    const estimatedFareRp = Math.min(10000, fare1 + fare2);
    const estimatedDurationMinutes = Math.max(8, Math.round(distanceKm * 2.8 + 8));

    return {
      originStop,
      destinationStop: destStop,
      directLines: [],
      transferOption,
      candidateLines,
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedFareRp,
      estimatedDurationMinutes,
    };
  }

  // 2b. Two-transfer itineraries: BFS over the line graph, top 2, so real
  // Jabodetabek trips (feeder -> trunk -> feeder) stay deterministic instead
  // of punting to the AI advisor. Runs only when direct/1-transfer failed.
  const stopsByLineId = new Map<string, Stop[]>();
  for (const l of allLines) {
    stopsByLineId.set(
      l.id,
      allStops.filter((s) => s.lineId === l.id)
    );
  }
  const sharedStop = (aId: string, bId: string): Stop | undefined => {
    const aStops = stopsByLineId.get(aId) ?? [];
    const bStops = stopsByLineId.get(bId) ?? [];
    return aStops.find((os) =>
      bStops.some(
        (ds) =>
          ds.name.trim().toLowerCase() === os.name.trim().toLowerCase() ||
          (os.connectedLineIds && os.connectedLineIds.includes(bId)) ||
          (ds.connectedLineIds && ds.connectedLineIds.includes(aId))
      )
    );
  };

  const transferLegs: NonNullable<PlannedJourney["transferLegs"]> = [];
  for (const oLine of candidateOriginLines) {
    for (const mLine of allLines) {
      if (mLine.id === oLine.id || destLineIds.has(mLine.id)) continue;
      const firstStop = sharedStop(oLine.id, mLine.id);
      if (!firstStop) continue;
      for (const dLine of candidateDestLines) {
        if (dLine.id === mLine.id || dLine.id === oLine.id) continue;
        const secondStop = sharedStop(mLine.id, dLine.id);
        if (!secondStop) continue;
        transferLegs.push({
          lines: [oLine, mLine, dLine],
          transferStops: [firstStop, secondStop],
        });
        if (transferLegs.length >= 2) break;
      }
      if (transferLegs.length >= 2) break;
    }
    if (transferLegs.length >= 2) break;
  }

  if (transferLegs.length > 0) {
    const best = transferLegs[0];
    const fare = best.lines.reduce(
      (sum, l) => sum + calculateLegFare(l.mode, distanceKm / 3),
      0
    );
    // JakLingko 3-hour tariff cap: Rp 10,000 max integrated ceiling
    const estimatedFareRp = Math.min(10000, fare);
    const estimatedDurationMinutes = Math.max(12, Math.round(distanceKm * 2.8 + 8) + 5);

    return {
      originStop,
      destinationStop: destStop,
      directLines: [],
      transferOption: undefined,
      transferLegs,
      candidateLines: best.lines,
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedFareRp,
      estimatedDurationMinutes,
    };
  }
  // 3. No direct line and no 1-transfer route found between stops
  return {
    originStop,
    destinationStop: destStop,
    directLines: [],
    transferOption: undefined,
    candidateLines: [],
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedFareRp: 0,
    estimatedDurationMinutes: Math.max(8, Math.round(distanceKm * 2.8 + 8)),
  };
}
