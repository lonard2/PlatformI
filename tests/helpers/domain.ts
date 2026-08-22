/**
 * PlatformI Transit Domain Reference Logic & Mathematical Specifications
 * Authoritative algorithms derived from ORIGINAL_REQUEST.md, PROJECT.md, and domain_specs.md.
 * Zero-emoji, full production mathematical precision.
 */

import crypto from 'node:crypto';

// ==========================================
// 1. SPHERICAL GEODESY & VECTOR MATHEMATICS
// ==========================================

export const EARTH_RADIUS_METERS = 6371000; // 6,371 km

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates great-circle surface distance between two coordinates in meters using the Haversine formula.
 * Coordinates are [latitude, longitude].
 */
export function haversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates initial azimuth bearing in degrees (0 to 360) from startCoord to endCoord.
 */
export function calculateBearing(startCoord: [number, number], endCoord: [number, number]): number {
  const [lat1, lon1] = startCoord;
  const [lat2, lon2] = endCoord;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLon = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);

  const initialBearingRadians = Math.atan2(y, x);
  const initialBearingDegrees = toDegrees(initialBearingRadians);

  return (initialBearingDegrees + 360) % 360;
}

/**
 * Calculates total surface length of a polyline in meters.
 */
export function calculatePolylineLength(polyline: [number, number][]): number {
  if (polyline.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    totalMeters += haversineDistance(polyline[i], polyline[i + 1]);
  }
  return totalMeters;
}

/**
 * Calculates cross-track distance in meters of point P relative to great-circle segment A->B.
 */
export function crossTrackError(
  point: [number, number],
  startCoord: [number, number],
  endCoord: [number, number]
): number {
  const distAP = haversineDistance(startCoord, point);
  if (distAP === 0) return 0;

  const delta13 = distAP / EARTH_RADIUS_METERS;
  const theta13 = toRadians(calculateBearing(startCoord, point));
  const theta12 = toRadians(calculateBearing(startCoord, endCoord));

  const dXt = Math.asin(Math.sin(delta13) * Math.sin(theta13 - theta12)) * EARTH_RADIUS_METERS;
  return dXt;
}

/**
 * Calculates along-track distance in meters of point P projected along segment A->B.
 */
export function alongTrackDistance(
  point: [number, number],
  startCoord: [number, number],
  endCoord: [number, number]
): number {
  const distAP = haversineDistance(startCoord, point);
  const dXt = crossTrackError(point, startCoord, endCoord);

  const delta13 = distAP / EARTH_RADIUS_METERS;
  const deltaXt = dXt / EARTH_RADIUS_METERS;

  const cosDeltaAt = Math.cos(delta13) / Math.cos(deltaXt);
  const clampedCos = Math.max(-1, Math.min(1, cosDeltaAt));
  const dAt = Math.acos(clampedCos) * EARTH_RADIUS_METERS;

  return dAt;
}

/**
 * Interpolates coordinate position and heading along a polyline at along-track distance in meters.
 */
export function interpolatePositionAlongPolyline(
  polyline: [number, number][],
  distanceMeters: number
): { position: [number, number]; heading: number; segmentIndex: number } {
  if (polyline.length === 0) {
    return { position: [0, 0], heading: 0, segmentIndex: 0 };
  }
  if (polyline.length === 1) {
    return { position: polyline[0], heading: 0, segmentIndex: 0 };
  }

  const totalLength = calculatePolylineLength(polyline);
  if (totalLength === 0) {
    return { position: polyline[0], heading: 0, segmentIndex: 0 };
  }

  // Handle wraparound and 100% progress
  let targetDistance = distanceMeters;
  if (totalLength > 0) {
    if (distanceMeters > 0 && distanceMeters <= totalLength && distanceMeters === totalLength) {
      targetDistance = totalLength;
    } else {
      targetDistance = distanceMeters % totalLength;
      if (targetDistance < 0) targetDistance += totalLength;
    }
  }

  let accumulatedDistance = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentLength = haversineDistance(polyline[i], polyline[i + 1]);
    if (accumulatedDistance + segmentLength >= targetDistance) {
      const segmentOffset = targetDistance - accumulatedDistance;
      const ratio = segmentLength > 0 ? segmentOffset / segmentLength : 0;

      const lat = polyline[i][0] + ratio * (polyline[i + 1][0] - polyline[i][0]);
      const lon = polyline[i][1] + ratio * (polyline[i + 1][1] - polyline[i][1]);
      const heading = calculateBearing(polyline[i], polyline[i + 1]);

      return {
        position: [lat, lon],
        heading,
        segmentIndex: i,
      };
    }
    accumulatedDistance += segmentLength;
  }

  const lastIdx = polyline.length - 2;
  return {
    position: polyline[polyline.length - 1],
    heading: calculateBearing(polyline[lastIdx], polyline[lastIdx + 1]),
    segmentIndex: lastIdx,
  };
}

// ==========================================
// 2. MULTI-MODAL FARE ENGINE & JAKLINGKO CAP
// ==========================================

export type TransitModeType =
  | 'mrt'
  | 'lrt_jabodebek'
  | 'lrt_jakarta'
  | 'krl'
  | 'whoosh'
  | 'kai_bandara'
  | 'kai_intercity'
  | 'tj_brt'
  | 'tj_non_brt'
  | 'mikrotrans'
  | 'akap_bus'
  | 'executive_shuttle'
  | 'aviation'
  | 'maritime';

export interface FareCalculationOptions {
  isPeak?: boolean;
  stationCount?: number;
  departureHour?: number;
  seatClass?: 'economy' | 'business' | 'first' | 'executive';
}

/**
 * Calculates single leg fare for a specific transit mode.
 */
export function calculateLegFare(
  mode: TransitModeType,
  distanceKm: number,
  options?: FareCalculationOptions
): number {
  const dist = Math.max(0, distanceKm);
  const opts = options || {};

  switch (mode) {
    case 'tj_brt':
    case 'tj_non_brt': {
      if (opts.departureHour !== undefined && opts.departureHour >= 5 && opts.departureHour < 7) {
        return 2000; // Early bird fare 05:00 - 07:00
      }
      return 3500; // Standard flat fare
    }

    case 'mikrotrans':
      return 0; // 100% Subsidized JakLingko MikroTrans

    case 'lrt_jakarta':
      return 5000; // Flat fare across Pegangsaan Dua - Velodrome

    case 'mrt': {
      // Base Rp 3,000 + Rp 1,000 per station or per km (capped at Rp 14,000 max)
      const count = opts.stationCount !== undefined ? opts.stationCount : Math.ceil(dist);
      const fare = 3000 + Math.max(0, count) * 1000;
      return Math.min(14000, fare);
    }

    case 'lrt_jabodebek': {
      // First 1 km = Rp 5,000, subsequent = Rp 700 / km (ceil)
      const extraKm = Math.ceil(Math.max(0, dist - 1));
      const rawFare = 5000 + extraKm * 700;
      const isPeak = opts.isPeak ?? false;
      const maxCap = isPeak ? 20000 : 10000;
      return Math.min(maxCap, rawFare);
    }

    case 'krl': {
      // Base Rp 3,000 for first 25 km + Rp 1,000 per additional 10 km (ceil)
      if (dist <= 25) return 3000;
      const additionalKm = dist - 25;
      const extraSegments = Math.ceil(additionalKm / 10);
      return 3000 + extraSegments * 1000;
    }

    case 'whoosh': {
      if (opts.seatClass === 'first') return 600000;
      if (opts.seatClass === 'business') return 450000;
      return 225000; // Premium Economy default
    }

    case 'kai_bandara': {
      if (opts.seatClass === 'executive') return 70000;
      return 50000; // Premium service default
    }

    case 'maritime': {
      if (dist > 30) return 74000; // Long distance island hop
      return 54000; // Short distance
    }

    case 'executive_shuttle':
      return 110000; // DayTrans / CitiTrans average

    case 'akap_bus':
      return 185000; // AKAP Executive average

    default:
      return 3500;
  }
}

export interface JakLingkoLegInput {
  mode: TransitModeType;
  distanceKm: number;
  tapInTime: Date;
  tapOutTime: Date;
  stationCount?: number;
  isPeak?: boolean;
}

export interface JakLingkoTripResult {
  totalFareRp: number;
  rawFareRp: number;
  isCapped: boolean;
  discountRp: number;
  isTransferValid: boolean;
  breakdown: {
    legIndex: number;
    mode: TransitModeType;
    legFareRp: number;
    rawFareRp: number;
  }[];
}

/**
 * Calculates integrated JakLingko fare enforcing 3-hour Rp 10,000 cap across MRT, LRT, and TransJakarta.
 */
export function calculateJakLingkoTripFare(legs: JakLingkoLegInput[]): JakLingkoTripResult {
  if (legs.length === 0) {
    return {
      totalFareRp: 0,
      rawFareRp: 0,
      isCapped: false,
      discountRp: 0,
      isTransferValid: true,
      breakdown: [],
    };
  }

  // Calculate raw unintegrated standalone total
  let rawTotal = 0;
  const rawBreakdowns = legs.map((leg, idx) => {
    const rawLegFare = calculateLegFare(leg.mode, leg.distanceKm, {
      stationCount: leg.stationCount,
      departureHour: leg.tapInTime.getHours(),
      isPeak: leg.isPeak,
    });
    rawTotal += rawLegFare;
    return { legIndex: idx, mode: leg.mode, rawFareRp: rawLegFare };
  });

  const tripStartTime = legs[0].tapInTime.getTime();
  let isTransferValid = true;

  // Integrated eligible modes: mrt, lrt_jabodebek, lrt_jakarta, tj_brt, tj_non_brt, mikrotrans
  const integratedModes: TransitModeType[] = [
    'mrt',
    'lrt_jabodebek',
    'lrt_jakarta',
    'tj_brt',
    'tj_non_brt',
    'mikrotrans',
  ];

  for (let i = 0; i < legs.length; i++) {
    const currentLeg = legs[i];
    if (!integratedModes.includes(currentLeg.mode)) {
      isTransferValid = false;
      break;
    }

    if (i > 0) {
      const prevLeg = legs[i - 1];
      const transferGapMinutes =
        (currentLeg.tapInTime.getTime() - prevLeg.tapOutTime.getTime()) / (1000 * 60);
      const totalElapsedMinutes =
        (currentLeg.tapOutTime.getTime() - tripStartTime) / (1000 * 60);

      // Max transfer gap is 45 minutes; Max total journey time is 180 minutes (3 hours)
      if (transferGapMinutes > 45 || totalElapsedMinutes > 180) {
        isTransferValid = false;
        break;
      }
    }
  }

  if (!isTransferValid) {
    return {
      totalFareRp: rawTotal,
      rawFareRp: rawTotal,
      isCapped: false,
      discountRp: 0,
      isTransferValid: false,
      breakdown: rawBreakdowns.map((b) => ({ ...b, legFareRp: b.rawFareRp })),
    };
  }

  // Integrated Tariff: Base boarding fee Rp 2,500 + Rp 500/km (Rp 250/45s)
  let integratedAccumulator = 2500;
  for (const leg of legs) {
    if (leg.mode === 'mikrotrans') continue;
    integratedAccumulator += Math.round(leg.distanceKm * 500);
  }

  const finalFare = Math.min(10000, integratedAccumulator);
  const isCapped = integratedAccumulator >= 10000 || finalFare < rawTotal;
  const discountRp = Math.max(0, rawTotal - finalFare);

  const breakdown = legs.map((leg, idx) => {
    const rawF = rawBreakdowns[idx].rawFareRp;
    const proportion = rawTotal > 0 ? rawF / rawTotal : 1 / legs.length;
    return {
      legIndex: idx,
      mode: leg.mode,
      legFareRp: Math.round(finalFare * proportion),
      rawFareRp: rawF,
    };
  });

  return {
    totalFareRp: finalFare,
    rawFareRp: rawTotal,
    isCapped,
    discountRp,
    isTransferValid: true,
    breakdown,
  };
}

// ==========================================
// 3. 30-SECOND ROLLING DYNAMIC QR SECURITY
// ==========================================

export const DEFAULT_QR_SECRET = 'PLTI_JAKARTA_TRANSIT_SECURE_KEY_2026';
export const TIME_STEP_MS = 30000; // 30 seconds

export interface RollingQRTokenResult {
  token: string;
  timeStep: number;
  secondsRemaining: number;
  fullPayload: string;
}

export interface GateValidationResult {
  isValid: boolean;
  ticketId: string;
  userId: string;
  timeStep: number;
  errorReason?: string;
}

/**
 * Computes HMAC-SHA256 token digest truncated to 16 hex characters.
 */
export function computeHMAC(payload: string, secretKey: string = DEFAULT_QR_SECRET): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Generates dynamic 30-second rolling QR security payload.
 */
export function generateRollingQRToken(
  ticketId: string,
  userId: string,
  timestampMs: number = Date.now(),
  secretKey: string = DEFAULT_QR_SECRET
): RollingQRTokenResult {
  const timeStep = Math.floor(timestampMs / TIME_STEP_MS);
  const secondsRemaining = 30 - (Math.floor(timestampMs / 1000) % 30);
  const payload = `PLATFORMI:TKT:${ticketId}:${userId}:${timeStep}`;
  const token = computeHMAC(payload, secretKey);
  const fullPayload = `PLATFORMI:${ticketId}:${userId}:${timeStep}:${token}`;

  return {
    token,
    timeStep,
    secondsRemaining,
    fullPayload,
  };
}

/**
 * Validates dynamic rolling QR token with anti-tamper and +/-1 window clock skew tolerance.
 */
export function validateRollingQRToken(
  scannedPayload: string,
  toleranceWindows: number = 1,
  currentTimestampMs: number = Date.now(),
  secretKey: string = DEFAULT_QR_SECRET,
  usedNonces?: Set<string>
): GateValidationResult {
  const parts = scannedPayload.split(':');
  if (parts.length !== 5 || parts[0] !== 'PLATFORMI') {
    return {
      isValid: false,
      ticketId: '',
      userId: '',
      timeStep: 0,
      errorReason: 'INVALID_PAYLOAD_STRUCTURE',
    };
  }

  const [, ticketId, userId, timeStepStr, scannedToken] = parts;
  const scannedTimeStep = parseInt(timeStepStr, 10);
  if (isNaN(scannedTimeStep)) {
    return {
      isValid: false,
      ticketId,
      userId,
      timeStep: 0,
      errorReason: 'CORRUPTED_TIMESTEP',
    };
  }

  const currentServerTimeStep = Math.floor(currentTimestampMs / TIME_STEP_MS);
  const stepDiff = Math.abs(scannedTimeStep - currentServerTimeStep);

  // Check window drift tolerance
  if (stepDiff > toleranceWindows) {
    return {
      isValid: false,
      ticketId,
      userId,
      timeStep: scannedTimeStep,
      errorReason: 'EXPIRED_QR_TOKEN',
    };
  }

  // Verify HMAC signature
  const expectedPayload = `PLATFORMI:TKT:${ticketId}:${userId}:${scannedTimeStep}`;
  const expectedToken = computeHMAC(expectedPayload, secretKey);

  if (scannedToken !== expectedToken) {
    return {
      isValid: false,
      ticketId,
      userId,
      timeStep: scannedTimeStep,
      errorReason: 'TAMPERED_QR_TOKEN',
    };
  }

  // Anti-replay verification
  const nonce = `${ticketId}:${scannedTimeStep}`;
  if (usedNonces && usedNonces.has(nonce)) {
    return {
      isValid: false,
      ticketId,
      userId,
      timeStep: scannedTimeStep,
      errorReason: 'REPLAYED_TOKEN_ALREADY_SCANNED',
    };
  }

  return {
    isValid: true,
    ticketId,
    userId,
    timeStep: scannedTimeStep,
  };
}

// ==========================================
// 4. CROWDSOURCING & EXPONENTIAL TIME DECAY
// ==========================================

export interface CrowdsourceCheckIn {
  id: string;
  vehicleId: string;
  densityRating: 1 | 2 | 3 | 4; // 1: Low, 2: Moderate, 3: High, 4: Crush
  acRating: 1 | 2 | 3 | 4 | 5; // 1: Hot to 5: Cold
  timestampMs: number;
  userId: string;
}

export const CROWDSOURCE_HALF_LIFE_SECONDS = 600; // 10 minutes

/**
 * Calculates exponential time decay weight for a given elapsed time.
 * w = exp( -ln(2) / t_half * delta_t )
 */
export function calculateDecayWeight(
  timestampMs: number,
  currentTimestampMs: number,
  halfLifeSeconds: number = CROWDSOURCE_HALF_LIFE_SECONDS
): number {
  const deltaSeconds = Math.max(0, (currentTimestampMs - timestampMs) / 1000);
  const lambda = Math.LN2 / halfLifeSeconds;
  return Math.exp(-lambda * deltaSeconds);
}

/**
 * Aggregates crowdsource reports with exponential time decay to compute active vehicle density rating (1-4).
 */
export function aggregateVehicleDensity(
  reports: CrowdsourceCheckIn[],
  currentTimestampMs: number = Date.now(),
  halfLifeSeconds: number = CROWDSOURCE_HALF_LIFE_SECONDS
): { densityLevel: 1 | 2 | 3 | 4; rawWeightedDensity: number; totalWeight: number } {
  if (reports.length === 0) {
    return { densityLevel: 1, rawWeightedDensity: 1.0, totalWeight: 0 };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const report of reports) {
    const weight = calculateDecayWeight(report.timestampMs, currentTimestampMs, halfLifeSeconds);
    weightedSum += weight * report.densityRating;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return { densityLevel: 1, rawWeightedDensity: 1.0, totalWeight: 0 };
  }

  const rawWeightedDensity = weightedSum / totalWeight;
  const clamped = Math.max(1, Math.min(4, Math.round(rawWeightedDensity))) as 1 | 2 | 3 | 4;

  return {
    densityLevel: clamped,
    rawWeightedDensity,
    totalWeight,
  };
}

/**
 * Aggregates AC comfort score (1 to 5) with exponential time decay.
 */
export function aggregateACComfort(
  reports: CrowdsourceCheckIn[],
  currentTimestampMs: number = Date.now(),
  halfLifeSeconds: number = CROWDSOURCE_HALF_LIFE_SECONDS
): number {
  if (reports.length === 0) return 3.0; // Default optimal comfort

  let weightedSum = 0;
  let totalWeight = 0;

  for (const report of reports) {
    const weight = calculateDecayWeight(report.timestampMs, currentTimestampMs, halfLifeSeconds);
    weightedSum += weight * report.acRating;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 3.0;
  return Number((weightedSum / totalWeight).toFixed(1));
}

/**
 * Formats relative timestamp in human-readable terms without emojis.
 */
export function formatRelativeTime(timestampMs: number, currentTimestampMs: number = Date.now()): string {
  const diffSeconds = Math.floor((currentTimestampMs - timestampMs) / 1000);
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ==========================================
// 5. SIMULATION VECTOR TELEMETRY
// ==========================================

export interface SimulatedVehicleState {
  id: string;
  lineId: string;
  mode: TransitModeType;
  currentDistanceMeters: number;
  speedKmh: number;
  position: [number, number];
  heading: number;
  dwellRemainingSeconds: number;
}

export function simulateVehicleMovement(
  vehicle: SimulatedVehicleState,
  polyline: [number, number][],
  deltaSeconds: number,
  speedMultiplier: number, // 0: pause, 1: 1x, 2: 2x, 5: 5x
  stopsAlongTrackMeters: number[] = [],
  stationDwellSeconds: number = 30
): SimulatedVehicleState {
  if (speedMultiplier === 0 || deltaSeconds <= 0) {
    return { ...vehicle };
  }

  const polylineLength = calculatePolylineLength(polyline);
  if (polylineLength === 0) return { ...vehicle };

  // Handle active station dwell
  if (vehicle.dwellRemainingSeconds > 0) {
    const newDwell = Math.max(0, vehicle.dwellRemainingSeconds - deltaSeconds * speedMultiplier);
    return {
      ...vehicle,
      dwellRemainingSeconds: newDwell,
    };
  }

  const speedMetersPerSecond = (vehicle.speedKmh * 1000) / 3600;
  const distanceCovered = speedMetersPerSecond * deltaSeconds * speedMultiplier;
  const newDistance = (vehicle.currentDistanceMeters + distanceCovered) % polylineLength;

  // Check if vehicle crossed any station stop to trigger dwell
  let triggeredDwell = 0;
  for (const stopDistance of stopsAlongTrackMeters) {
    if (
      vehicle.currentDistanceMeters < stopDistance &&
      vehicle.currentDistanceMeters + distanceCovered >= stopDistance
    ) {
      triggeredDwell = stationDwellSeconds;
      break;
    }
  }

  const { position, heading } = interpolatePositionAlongPolyline(polyline, newDistance);

  return {
    ...vehicle,
    currentDistanceMeters: newDistance,
    position,
    heading,
    dwellRemainingSeconds: triggeredDwell,
  };
}

/**
 * Calculates dynamic ETA in seconds to next stop with dwell time consideration.
 */
export function calculateNextStopETA(
  currentDistanceMeters: number,
  nextStopDistanceMeters: number,
  speedKmh: number,
  speedMultiplier: number = 1,
  intermediateDwellSeconds: number = 0
): number {
  if (speedMultiplier === 0) return Infinity;
  const speedMps = (speedKmh * 1000) / 3600;
  if (speedMps <= 0) return Infinity;

  const distanceRemaining = Math.max(0, nextStopDistanceMeters - currentDistanceMeters);
  const travelTimeSeconds = distanceRemaining / (speedMps * speedMultiplier);
  return Math.round(travelTimeSeconds + intermediateDwellSeconds);
}
