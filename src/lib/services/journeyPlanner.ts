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
function findMatchingStop(input: string, allStops: Stop[]): Stop | null {
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

  // 3. Substring inclusion match
  const subMatch = allStops.find(
    (s) => s.name.toLowerCase().includes(normStripped) || normStripped.includes(stripPrefix(s.name))
  );
  if (subMatch) return subMatch;

  return null;
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

  const candidateLines = transferOption
    ? [transferOption.firstLine, transferOption.secondLine]
    : [...candidateOriginLines.slice(0, 2), ...candidateDestLines.slice(0, 2)];

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
