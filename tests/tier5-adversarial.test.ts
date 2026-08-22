/**
 * PlatformI - Tier 5 White-Box Adversarial Hardening Test Suite
 *
 * Exercises extreme edge cases, security attack vectors, sub-second boundary transitions,
 * geodesic singularities, malformed payloads, replay attacks, and AI model resilience.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  haversineDistance,
  calculateBearing,
  calculatePolylineLength,
  crossTrackError,
  alongTrackDistance,
  interpolatePositionAlongPolyline,
  findNearestPointOnPolyline,
  calculateNextStopEta,
  toDegrees,
  toRadians,
  EARTH_RADIUS_METERS,
} from "@/lib/math/geodesy";
import {
  calculateLegFare,
  calculateJakLingkoTripFare,
  normalizeModeKey,
  isJakLingkoEligibleMode,
  JakLingkoLegInput,
  formatRupiah,
} from "@/lib/services/fareCalculator";
import {
  computeHMAC,
  generateRollingQRToken,
  validateRollingQRToken,
  getQRCountdownInfo,
  generateQRMatrixGrid,
  TIME_STEP_MS,
  DEFAULT_QR_SECRET,
} from "@/lib/services/qrSecurityService";
import {
  SUPPORTED_AI_MODELS,
  DEFAULT_AI_MODEL_ID,
  PROMPT_SUGGESTIONS,
  buildTransitSystemPrompt,
  generateLocalGroundedResponse,
  queryTransitAdvisor,
} from "@/lib/services/aiTransitService";

describe("Tier 5: White-Box Adversarial Hardening & Stress Testing", () => {
  // =========================================================================
  // 1. GEODESIC MATH & SPHERICAL GEOMETRY ADVERSARIAL STRESS TESTS
  // =========================================================================
  describe("1. Geodesic Math & Spherical Geometry Adversarial Tests", () => {
    it("handles true antipodal coordinates without NaN or math domain errors", () => {
      // North Pole to South Pole
      const distPoles = haversineDistance([90, 0], [-90, 0]);
      const expectedHalfCircumference = Math.PI * EARTH_RADIUS_METERS;
      expect(distPoles).toBeCloseTo(expectedHalfCircumference, -2);
      expect(Number.isNaN(distPoles)).toBe(false);

      // Equator antipodal points: (0, 0) and (0, 180)
      const distEquatorAntipode = haversineDistance([0, 0], [0, 180]);
      expect(distEquatorAntipode).toBeCloseTo(expectedHalfCircumference, -2);

      // Bearing from North Pole to South Pole along Prime Meridian
      const bearingSouth = calculateBearing([90, 0], [-90, 0]);
      expect(bearingSouth).toBeGreaterThanOrEqual(0);
      expect(bearingSouth).toBeLessThanOrEqual(360);
      expect(Number.isNaN(bearingSouth)).toBe(false);
    });

    it("handles identical points (zero-distance) across all geodesic functions", () => {
      const p1: [number, number] = [-6.2088, 106.8456];
      const p2: [number, number] = [-6.2088, 106.8456];

      expect(haversineDistance(p1, p2)).toBe(0);
      expect(calculateBearing(p1, p2)).toBe(0);
      expect(crossTrackError(p1, p1, p2)).toBe(0);
      expect(alongTrackDistance(p1, p1, p2)).toBe(0);
    });

    it("handles polylines with identical consecutive vertices (zero-length segments)", () => {
      const polyWithDuplicates: [number, number][] = [
        [-6.2, 106.8],
        [-6.2, 106.8], // Duplicate point
        [-6.21, 106.81],
        [-6.21, 106.81], // Duplicate point
        [-6.22, 106.82],
      ];

      const length = calculatePolylineLength(polyWithDuplicates);
      expect(length).toBeGreaterThan(0);
      expect(Number.isNaN(length)).toBe(false);

      // Interpolation along polyline with duplicates
      const interpolatedMid = interpolatePositionAlongPolyline(
        polyWithDuplicates,
        length / 2
      );
      expect(Number.isNaN(interpolatedMid.position[0])).toBe(false);
      expect(Number.isNaN(interpolatedMid.position[1])).toBe(false);
      expect(Number.isNaN(interpolatedMid.heading)).toBe(false);
      expect(interpolatedMid.heading).toBeGreaterThanOrEqual(0);
      expect(interpolatedMid.heading).toBeLessThanOrEqual(360);

      // Nearest point on polyline with duplicates
      const nearest = findNearestPointOnPolyline(
        [-6.205, 106.805],
        polyWithDuplicates
      );
      expect(Number.isFinite(nearest.distanceMeters)).toBe(true);
      expect(nearest.distanceMeters).toBeGreaterThan(0);
      expect(Number.isNaN(nearest.alongTrackMeters)).toBe(false);
    });

    it("handles collinear vertices and preserves correct along-track segment mapping", () => {
      // 4 Collinear points along a straight latitude segment
      const collinearPoly: [number, number][] = [
        [-6.2, 106.8],
        [-6.2, 106.82],
        [-6.2, 106.84],
        [-6.2, 106.86],
      ];

      const totalLen = calculatePolylineLength(collinearPoly);
      expect(totalLen).toBeGreaterThan(0);

      // Query point directly on the second segment
      const testPoint: [number, number] = [-6.2, 106.83];
      const projection = findNearestPointOnPolyline(testPoint, collinearPoly);

      expect(projection.distanceMeters).toBeCloseTo(0, 0);
      expect(projection.segmentIndex).toBe(1); // Second segment: index 1
      expect(projection.alongTrackMeters).toBeGreaterThan(0);
      expect(projection.alongTrackMeters).toBeLessThan(totalLen);
    });

    it("handles extreme distance modulo wraparound for simulation loops", () => {
      const linePoly: [number, number][] = [
        [-6.2008, 106.8227], // Dukuh Atas
        [-6.2088, 106.8197], // Benhil
        [-6.2387, 106.7986], // ASEAN
        [-6.2892, 106.7749], // Lebak Bulus
      ];
      const totalLen = calculatePolylineLength(linePoly);

      // Advance by 10 full loops + half distance
      const extremeDist = totalLen * 10 + totalLen / 2;
      const result = interpolatePositionAlongPolyline(linePoly, extremeDist);

      const standardMid = interpolatePositionAlongPolyline(
        linePoly,
        totalLen / 2
      );
      expect(result.position[0]).toBeCloseTo(standardMid.position[0], 5);
      expect(result.position[1]).toBeCloseTo(standardMid.position[1], 5);
      expect(result.heading).toBeCloseTo(standardMid.heading, 1);
      expect(result.segmentIndex).toBe(standardMid.segmentIndex);
    });

    it("handles extreme speed multipliers and edge-case velocities in ETA calculations", () => {
      const distRemaining = 5000; // 5 km
      const baseSpeedKmh = 60;

      // 1. Paused simulation (multiplier = 0) -> Infinity ETA
      const etaPaused = calculateNextStopEta(0, distRemaining, baseSpeedKmh, 0);
      expect(etaPaused).toBe(Infinity);

      // 2. High-speed multiplier (100x) -> Returns small positive integer
      const etaSuperSpeed = calculateNextStopEta(
        0,
        distRemaining,
        baseSpeedKmh,
        100
      );
      expect(etaSuperSpeed).toBe(3); // 300s / 100 = 3s
      expect(etaSuperSpeed).toBeGreaterThan(0);

      // 3. Zero speed cruising (speed = 0) -> Infinity ETA
      const etaZeroSpeed = calculateNextStopEta(0, distRemaining, 0, 1);
      expect(etaZeroSpeed).toBe(Infinity);

      // 4. Negative distance remaining (passed the stop) -> Returns intermediate dwell or 0
      const etaNegativeDist = calculateNextStopEta(6000, 5000, baseSpeedKmh, 1, 15);
      expect(etaNegativeDist).toBe(15);
    });

    it("handles empty and single-point polylines without crashing", () => {
      const emptyPoly: [number, number][] = [];
      const singlePoly: [number, number][] = [[-6.2088, 106.8456]];

      expect(calculatePolylineLength(emptyPoly)).toBe(0);
      expect(calculatePolylineLength(singlePoly)).toBe(0);

      const emptyInterp = interpolatePositionAlongPolyline(emptyPoly, 100);
      expect(emptyInterp.position).toEqual([0, 0]);

      const singleInterp = interpolatePositionAlongPolyline(singlePoly, 100);
      expect(singleInterp.position).toEqual([-6.2088, 106.8456]);

      const emptyNearest = findNearestPointOnPolyline([-6.2, 106.8], emptyPoly);
      expect(emptyNearest.distanceMeters).toBe(Infinity);

      const singleNearest = findNearestPointOnPolyline([-6.2, 106.8], singlePoly);
      expect(singleNearest.distanceMeters).toBeGreaterThan(0);
      expect(singleNearest.nearestPoint.latitude).toBe(-6.2088);
    });
  });

  // =========================================================================
  // 2. JAKLINGKO INTEGRATED TARIFF SUB-SECOND & BOUNDARY ADVERSARIAL TESTS
  // =========================================================================
  describe("2. JakLingko Integrated Tariff Sub-Second Boundary Tests", () => {
    const baseDate = new Date("2026-08-22T08:00:00.000Z");

    it("enforces exact 180-minute (3-hour) boundary at sub-second precision", () => {
      // Trip 1: Total elapsed time 179 minutes 59 seconds (10,799 seconds) -> CAPPED
      const legsWithinCap: JakLingkoLegInput[] = [
        {
          mode: "mrt",
          distanceKm: 14,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 30 * 60 * 1000), // +30m
        },
        {
          mode: "tj_brt",
          distanceKm: 10,
          tapInTime: new Date(baseDate.getTime() + 45 * 60 * 1000), // +45m (15m transfer gap)
          tapOutTime: new Date(baseDate.getTime() + 100 * 60 * 1000), // +100m
        },
        {
          mode: "lrt_jakarta",
          distanceKm: 8,
          tapInTime: new Date(baseDate.getTime() + 120 * 60 * 1000), // +120m (20m transfer gap)
          tapOutTime: new Date(baseDate.getTime() + 179 * 60 * 1000 + 59 * 1000), // 179m 59s
        },
      ];

      const resWithin = calculateJakLingkoTripFare(legsWithinCap);
      expect(resWithin.isTransferValid).toBe(true);
      expect(resWithin.totalFareRp).toBe(10000);
      expect(resWithin.isCapped).toBe(true);
      expect(resWithin.discountRp).toBeGreaterThan(0);

      // Trip 2: Total elapsed time 180 minutes 01 seconds (10,801 seconds) -> UNCAPPED (invalidated)
      const legsExceedingCap: JakLingkoLegInput[] = [
        {
          mode: "mrt",
          distanceKm: 14,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 30 * 60 * 1000),
        },
        {
          mode: "tj_brt",
          distanceKm: 10,
          tapInTime: new Date(baseDate.getTime() + 45 * 60 * 1000),
          tapOutTime: new Date(baseDate.getTime() + 100 * 60 * 1000),
        },
        {
          mode: "lrt_jakarta",
          distanceKm: 8,
          tapInTime: new Date(baseDate.getTime() + 120 * 60 * 1000),
          tapOutTime: new Date(baseDate.getTime() + 180 * 60 * 1000 + 1 * 1000), // 180m 01s
        },
      ];

      const resExceeding = calculateJakLingkoTripFare(legsExceedingCap);
      expect(resExceeding.isTransferValid).toBe(false);
      // Fallback: MRT (Rp 14,000) + TJ (Rp 3,500) + LRT Jkt (Rp 5,000) = Rp 22,500
      expect(resExceeding.totalFareRp).toBe(22500);
      expect(resExceeding.isCapped).toBe(false);
      expect(resExceeding.discountRp).toBe(0);
    });

    it("enforces exact 45-minute inter-modal transfer gap boundary", () => {
      // Transfer gap of 44 minutes 59 seconds -> VALID
      const legsValidGap: JakLingkoLegInput[] = [
        {
          mode: "tj_brt",
          distanceKm: 5,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 20 * 60 * 1000), // 08:20
        },
        {
          mode: "mrt",
          distanceKm: 8,
          tapInTime: new Date(
            baseDate.getTime() + 20 * 60 * 1000 + (44 * 60 * 1000 + 59 * 1000) // 44m 59s gap
          ),
          tapOutTime: new Date(baseDate.getTime() + 90 * 60 * 1000),
        },
      ];

      const resValidGap = calculateJakLingkoTripFare(legsValidGap);
      expect(resValidGap.isTransferValid).toBe(true);
      expect(resValidGap.totalFareRp).toBeLessThanOrEqual(10000);

      // Transfer gap of 45 minutes 01 seconds -> INVALID (reset)
      const legsInvalidGap: JakLingkoLegInput[] = [
        {
          mode: "tj_brt",
          distanceKm: 5,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 20 * 60 * 1000), // 08:20
        },
        {
          mode: "mrt",
          distanceKm: 8,
          tapInTime: new Date(
            baseDate.getTime() + 20 * 60 * 1000 + (45 * 60 * 1000 + 1 * 1000) // 45m 01s gap
          ),
          tapOutTime: new Date(baseDate.getTime() + 90 * 60 * 1000),
        },
      ];

      const resInvalidGap = calculateJakLingkoTripFare(legsInvalidGap);
      expect(resInvalidGap.isTransferValid).toBe(false);
      // TJ (Rp 3,500) + MRT 8km (Rp 3,000 + 8,000 = Rp 11,000) = Rp 14,500
      expect(resInvalidGap.totalFareRp).toBe(14500);
    });

    it("handles rapid multi-leg journey loops (8 consecutive legs within 120 minutes)", () => {
      const rapidLegs: JakLingkoLegInput[] = [];
      let curTime = baseDate.getTime();

      for (let i = 0; i < 8; i++) {
        const tapIn = new Date(curTime);
        const tapOut = new Date(curTime + 10 * 60 * 1000); // 10 min ride
        rapidLegs.push({
          mode: i % 2 === 0 ? "tj_brt" : "mrt",
          distanceKm: 4,
          tapInTime: tapIn,
          tapOutTime: tapOut,
        });
        curTime += 14 * 60 * 1000; // 10 min ride + 4 min transfer gap
      }

      const resRapid = calculateJakLingkoTripFare(rapidLegs);
      expect(resRapid.isTransferValid).toBe(true);
      expect(resRapid.totalFareRp).toBe(10000);
      expect(resRapid.isCapped).toBe(true);
      expect(resRapid.breakdown.length).toBe(8);

      const sumBreakdown = resRapid.breakdown.reduce(
        (sum, b) => sum + b.legFareRp,
        0
      );
      expect(sumBreakdown).toBeCloseTo(10000, -2);
    });

    it("correctly flags and computes standalone fares when non-integrated transport is interleaved", () => {
      // Interleaving AKAP Bus (unintegrated) between TransJakarta and MRT
      const mixedLegs: JakLingkoLegInput[] = [
        {
          mode: "tj_brt",
          distanceKm: 10,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 30 * 60 * 1000),
        },
        {
          mode: "akap_bus", // Ineligible mode
          distanceKm: 40,
          tapInTime: new Date(baseDate.getTime() + 40 * 60 * 1000),
          tapOutTime: new Date(baseDate.getTime() + 90 * 60 * 1000),
        },
        {
          mode: "mrt",
          distanceKm: 12,
          tapInTime: new Date(baseDate.getTime() + 100 * 60 * 1000),
          tapOutTime: new Date(baseDate.getTime() + 130 * 60 * 1000),
        },
      ];

      expect(isJakLingkoEligibleMode("akap_bus")).toBe(false);
      expect(isJakLingkoEligibleMode("tj_brt")).toBe(true);
      expect(isJakLingkoEligibleMode("mrt")).toBe(true);

      const resMixed = calculateJakLingkoTripFare(mixedLegs);
      expect(resMixed.isTransferValid).toBe(false);
      // TJ (3,500) + AKAP (185,000) + MRT (3,000 + 12,000 = 14,000 max) = 202,500
      expect(resMixed.totalFareRp).toBe(202500);
    });

    it("handles zero distance, extreme distance, and MikroTrans zero-tariff legs", () => {
      // 1. Zero distance leg
      expect(calculateLegFare("mrt", 0)).toBe(3000);
      expect(calculateLegFare("tj_brt", 0)).toBe(3500);
      expect(calculateLegFare("mikrotrans", 100)).toBe(0);

      // 2. Extreme distance (500 km on MRT -> Capped at Rp 14,000 max)
      expect(calculateLegFare("mrt", 500)).toBe(14000);

      // 3. MikroTrans + MRT + TransJakarta integrated combination
      const mikroPlusLegs: JakLingkoLegInput[] = [
        {
          mode: "mikrotrans",
          distanceKm: 6,
          tapInTime: new Date(baseDate.getTime()),
          tapOutTime: new Date(baseDate.getTime() + 20 * 60 * 1000),
        },
        {
          mode: "mrt",
          distanceKm: 10,
          tapInTime: new Date(baseDate.getTime() + 30 * 60 * 1000),
          tapOutTime: new Date(baseDate.getTime() + 55 * 60 * 1000),
        },
      ];

      const resMikro = calculateJakLingkoTripFare(mikroPlusLegs);
      expect(resMikro.isTransferValid).toBe(true);
      // MikroTrans (Rp 0) does not add distance fare; Base Rp 2,500 + MRT (10km * 500 = 5,000) = Rp 7,500
      expect(resMikro.totalFareRp).toBe(7500);
      expect(formatRupiah(7500)).toContain("7.500");
    });
  });

  // =========================================================================
  // 3. 30-SECOND ROLLING QR CRYPTOGRAPHIC ATTACK VECTOR TESTS
  // =========================================================================
  describe("3. 30-Second Rolling QR Cryptographic Attack Vectors", () => {
    const ticketId = "TKT-JABODETABEK-8821";
    const userId = "USR-COMMUTER-409";
    const currentMs = 1755864000000; // Fixed epoch time

    it("generates deterministic HMAC tokens and allows exact +/-1 window clock skew", () => {
      const generated = generateRollingQRToken(ticketId, userId, currentMs);
      expect(generated.token.length).toBe(16);
      expect(generated.fullPayload).toBe(
        `PLATFORMI:${ticketId}:${userId}:${generated.timeStep}:${generated.token}`
      );

      // 1. Exact current window (skew = 0) -> VALID
      const valCurrent = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs
      );
      expect(valCurrent.isValid).toBe(true);
      expect(valCurrent.ticketId).toBe(ticketId);
      expect(valCurrent.userId).toBe(userId);

      // 2. Previous window (skew = -1, 30s in past) -> VALID
      const valPast = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs + TIME_STEP_MS
      );
      expect(valPast.isValid).toBe(true);

      // 3. Next window (skew = +1, 30s in future) -> VALID
      const valFuture = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs - TIME_STEP_MS
      );
      expect(valFuture.isValid).toBe(true);
    });

    it("rejects tokens with clock skew beyond +/-1 window tolerance", () => {
      const generated = generateRollingQRToken(ticketId, userId, currentMs);

      // 1. Two windows in the past (60 seconds late) -> EXPIRED
      const valLate = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs + 2 * TIME_STEP_MS
      );
      expect(valLate.isValid).toBe(false);
      expect(valLate.errorReason).toBe("EXPIRED_QR_TOKEN");

      // 2. Two windows in the future (60 seconds ahead) -> EXPIRED
      const valEarly = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs - 2 * TIME_STEP_MS
      );
      expect(valEarly.isValid).toBe(false);
      expect(valEarly.errorReason).toBe("EXPIRED_QR_TOKEN");

      // 3. Ten windows in the past (5 minutes late) -> EXPIRED
      const valAncient = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs + 10 * TIME_STEP_MS
      );
      expect(valAncient.isValid).toBe(false);
      expect(valAncient.errorReason).toBe("EXPIRED_QR_TOKEN");
    });

    it("detects and rejects tampered HMAC signatures and forged payloads", () => {
      const generated = generateRollingQRToken(ticketId, userId, currentMs);

      // 1. Tamper single hex character in HMAC signature
      const tamperedChar = generated.token[0] === "a" ? "b" : "a";
      const tamperedToken = tamperedChar + generated.token.substring(1);
      const tamperedPayload = `PLATFORMI:${ticketId}:${userId}:${generated.timeStep}:${tamperedToken}`;

      const resTamperedSig = validateRollingQRToken(
        tamperedPayload,
        1,
        currentMs
      );
      expect(resTamperedSig.isValid).toBe(false);
      expect(resTamperedSig.errorReason).toBe("TAMPERED_QR_TOKEN");

      // 2. Tamper ticket ID with original signature
      const forgedTicketPayload = `PLATFORMI:TKT-FORGED-9999:${userId}:${generated.timeStep}:${generated.token}`;
      const resForgedTicket = validateRollingQRToken(
        forgedTicketPayload,
        1,
        currentMs
      );
      expect(resForgedTicket.isValid).toBe(false);
      expect(resForgedTicket.errorReason).toBe("TAMPERED_QR_TOKEN");

      // 3. Tamper user ID with original signature
      const forgedUserPayload = `PLATFORMI:${ticketId}:USR-ATTACKER-666:${generated.timeStep}:${generated.token}`;
      const resForgedUser = validateRollingQRToken(
        forgedUserPayload,
        1,
        currentMs
      );
      expect(resForgedUser.isValid).toBe(false);
      expect(resForgedUser.errorReason).toBe("TAMPERED_QR_TOKEN");

      // 4. Token signed with wrong secret key
      const wrongKeyPayload = generateRollingQRToken(
        ticketId,
        userId,
        currentMs,
        "WRONG_ATTACKER_SECRET_KEY"
      ).fullPayload;
      const resWrongKey = validateRollingQRToken(
        wrongKeyPayload,
        1,
        currentMs,
        DEFAULT_QR_SECRET
      );
      expect(resWrongKey.isValid).toBe(false);
      expect(resWrongKey.errorReason).toBe("TAMPERED_QR_TOKEN");
    });

    it("prevents double-entry turnstile gate replay attacks via nonce tracking", () => {
      const generated = generateRollingQRToken(ticketId, userId, currentMs);
      const usedNonces = new Set<string>();

      // First entry scan -> SUCCEEDS
      const firstScan = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs,
        DEFAULT_QR_SECRET,
        usedNonces
      );
      expect(firstScan.isValid).toBe(true);

      // Register nonce in gate memory
      usedNonces.add(`${ticketId}:${generated.timeStep}`);

      // Second entry scan (replay attempt with same valid token) -> REJECTED
      const replayScan = validateRollingQRToken(
        generated.fullPayload,
        1,
        currentMs,
        DEFAULT_QR_SECRET,
        usedNonces
      );
      expect(replayScan.isValid).toBe(false);
      expect(replayScan.errorReason).toBe("REPLAYED_TOKEN_ALREADY_SCANNED");
    });

    it("handles corrupted, truncated, and malformed payload strings gracefully", () => {
      // 1. Empty string
      const resEmpty = validateRollingQRToken("", 1, currentMs);
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errorReason).toBe("INVALID_PAYLOAD_STRUCTURE");

      // 2. Missing prefix
      const resNoPrefix = validateRollingQRToken(
        `FAKEPREFIX:${ticketId}:${userId}:1000:abcdef1234567890`,
        1,
        currentMs
      );
      expect(resNoPrefix.isValid).toBe(false);
      expect(resNoPrefix.errorReason).toBe("INVALID_PAYLOAD_STRUCTURE");

      // 3. Insufficient parts (only 3 parts instead of 5)
      const resShort = validateRollingQRToken("PLATFORMI:TKT:123", 1, currentMs);
      expect(resShort.isValid).toBe(false);
      expect(resShort.errorReason).toBe("INVALID_PAYLOAD_STRUCTURE");

      // 4. Non-numeric timeStep
      const resBadTimeStep = validateRollingQRToken(
        `PLATFORMI:${ticketId}:${userId}:NOT_A_NUMBER:abcdef1234567890`,
        1,
        currentMs
      );
      expect(resBadTimeStep.isValid).toBe(false);
      expect(resBadTimeStep.errorReason).toBe("CORRUPTED_TIMESTEP");
    });

    it("generates correct SVG QR matrix grid with intact finder and timing patterns", () => {
      const testPayload = "PLATFORMI:TKT-1:USR-1:1000:a1b2c3d4e5f67890";
      const size = 25;
      const grid = generateQRMatrixGrid(testPayload, size);

      expect(grid.length).toBe(size);
      expect(grid[0].length).toBe(size);

      // Verify Top-Left finder pattern outer border is active
      expect(grid[0][0]).toBe(true);
      expect(grid[0][6]).toBe(true);
      expect(grid[6][0]).toBe(true);
      expect(grid[6][6]).toBe(true);

      // Verify Top-Right finder pattern
      expect(grid[0][size - 1]).toBe(true);
      expect(grid[0][size - 7]).toBe(true);

      // Verify Bottom-Left finder pattern
      expect(grid[size - 1][0]).toBe(true);
      expect(grid[size - 7][0]).toBe(true);

      // Verify countdown telemetry
      const countdown = getQRCountdownInfo(currentMs);
      expect(countdown.secondsRemaining).toBeGreaterThanOrEqual(0);
      expect(countdown.secondsRemaining).toBeLessThanOrEqual(30);
      expect(countdown.progressPercent).toBeGreaterThanOrEqual(0);
      expect(countdown.progressPercent).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // 4. AI MULTI-MODEL ADVISOR RESILIENCE & DOMAIN GROUNDING TESTS
  // =========================================================================
  describe("4. AI Multi-Model Advisor Resilience & Domain Grounding Tests", () => {
    it("validates that all 6 designated OpenRouter models are registered and configured", () => {
      const requiredModelIds = [
        "google/gemini-3.7-flash",
        "google/gemini-3.5-flash-lite",
        "deepseek/deepseek-v4-pro-0813",
        "qwen/qwen3.7-plus",
        "openai/gpt-5.6-luna",
        "google/gemma-4-26b-a4b-it",
      ];

      expect(SUPPORTED_AI_MODELS.length).toBe(6);

      for (const requiredId of requiredModelIds) {
        const found = SUPPORTED_AI_MODELS.find((m) => m.id === requiredId);
        expect(found).toBeDefined();
        expect(found?.name.length).toBeGreaterThan(0);
        expect(found?.provider.length).toBeGreaterThan(0);
        expect(found?.tagline.length).toBeGreaterThan(0);
        expect(found?.badgeColor.length).toBeGreaterThan(0);
        expect(found?.contextWindow).toBeGreaterThan(10000);
      }

      expect(DEFAULT_AI_MODEL_ID).toBe("google/gemini-3.7-flash");
    });

    it("verifies system prompt contains complete transit domain taxonomy without raw emojis", () => {
      const systemPrompt = buildTransitSystemPrompt();

      // Check key transit modes
      expect(systemPrompt).toContain("MRT Jakarta");
      expect(systemPrompt).toContain("LRT Jabodebek");
      expect(systemPrompt).toContain("LRT Jakarta");
      expect(systemPrompt).toContain("KRL Commuter Line");
      expect(systemPrompt).toContain("Whoosh High-Speed Rail");
      expect(systemPrompt).toContain("TransJakarta BRT");
      expect(systemPrompt).toContain("MikroTrans");
      expect(systemPrompt).toContain("Soekarno-Hatta");
      expect(systemPrompt).toContain("Kepulauan Seribu");

      // Check key interchange hubs & skybridges
      expect(systemPrompt).toContain("Dukuh Atas TOD");
      expect(systemPrompt).toContain("CSW - ASEAN");
      expect(systemPrompt).toContain("Manggarai");
      expect(systemPrompt).toContain("Stasiun Halim");

      // Check tariff rules
      expect(systemPrompt).toContain("JakLingko Integrated Fare");
      expect(systemPrompt).toContain("10,000");
      expect(systemPrompt).toContain("180 minutes");

      // Verify ZERO raw emojis in system prompt
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(systemPrompt)).toBe(false);
    });

    it("executes local grounded reasoning fallback across all 6 model IDs in test environment", async () => {
      const testQueries = [
        "How do I transfer from Whoosh Halim to Dukuh Atas via LRT Jabodebek?",
        "What is the best route from Lebak Bulus MRT to PIK (Pantai Indah Kapuk)?",
        "Explain how the JakLingko 3-hour Rp 10,000 maximum fare cap works.",
        "How to travel from Bekasi to Soekarno-Hatta Airport (CGK)?",
        "Describe the CSW-ASEAN multi-level skybridge connection.",
        "How to take a speedboat to Pulau Pramuka in Kepulauan Seribu?",
      ];

      for (let i = 0; i < SUPPORTED_AI_MODELS.length; i++) {
        const model = SUPPORTED_AI_MODELS[i];
        const query = testQueries[i % testQueries.length];

        const response = await queryTransitAdvisor(
          [{ role: "user", content: query }],
          model.id
        );

        expect(response.fallbackUsed).toBe(true);
        expect(response.modelUsed).toBe(model.id);
        expect(response.content.length).toBeGreaterThan(100);
        expect(response.suggestedLines.length).toBeGreaterThan(0);
        expect(response.timestamp).toBeDefined();

        // Verify ZERO raw emojis in generated output
        const emojiRegex =
          /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        expect(emojiRegex.test(response.content)).toBe(false);
      }
    });

    it("handles invalid model ID by falling back safely to DEFAULT_AI_MODEL_ID", async () => {
      const response = await queryTransitAdvisor(
        [{ role: "user", content: "Check fare rules" }],
        "unsupported/fake-model-id"
      );

      expect(response.fallbackUsed).toBe(true);
      expect(response.modelUsed).toBe(DEFAULT_AI_MODEL_ID);
      expect(response.content).toContain("JakLingko");
    });

    it("verifies all prompt suggestions have valid categories and query text", () => {
      expect(PROMPT_SUGGESTIONS.length).toBe(6);

      for (const sug of PROMPT_SUGGESTIONS) {
        expect(sug.id).toBeDefined();
        expect(sug.label.length).toBeGreaterThan(0);
        expect(sug.prompt.length).toBeGreaterThan(10);
        expect(["ROUTE", "FARE", "TRANSFER", "AIRPORT_ISLAND"]).toContain(
          sug.category
        );

        // Verify response can be generated for each suggestion
        const res = generateLocalGroundedResponse(sug.prompt, DEFAULT_AI_MODEL_ID);
        expect(res.content.length).toBeGreaterThan(50);
        expect(res.fallbackUsed).toBe(true);
      }
    });
  });
});
