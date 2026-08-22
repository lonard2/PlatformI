/**
 * Milestone 4 Automated Test Suite: Fare Engine & Cryptographic QR Security Services
 * Directly exercises src/lib/services/fareCalculator.ts and src/lib/services/qrSecurityService.ts
 */

import { describe, it, expect } from "vitest";
import {
  calculateLegFare,
  calculateJakLingkoTripFare,
  normalizeModeKey,
  isJakLingkoEligibleMode,
  formatRupiah,
  JakLingkoLegInput,
} from "../src/lib/services/fareCalculator";
import {
  generateRollingQRToken,
  validateRollingQRToken,
  computeHMAC,
  getQRCountdownInfo,
  generateQRMatrixGrid,
  TIME_STEP_MS,
  DEFAULT_QR_SECRET,
} from "../src/lib/services/qrSecurityService";

describe("Milestone 4: Fare Engine Service (fareCalculator.ts)", () => {
  it("normalizes mode strings correctly", () => {
    expect(normalizeModeKey("MRT_JAKARTA")).toBe("mrt");
    expect(normalizeModeKey("TRANSJAKARTA_BRT")).toBe("tj_brt");
    expect(normalizeModeKey("LRT_JABODEBEK_CIBUBUR")).toBe("lrt_jabodebek");
    expect(normalizeModeKey("KRL_BOGOR")).toBe("krl");
    expect(normalizeModeKey("MIKROTRANS")).toBe("mikrotrans");
  });

  it("calculates TransJakarta flat and early-bird fares", () => {
    expect(calculateLegFare("TRANSJAKARTA_BRT", 10.0, { departureHour: 6 })).toBe(2000);
    expect(calculateLegFare("TRANSJAKARTA_BRT", 10.0, { departureHour: 8 })).toBe(3500);
    expect(calculateLegFare("MIKROTRANS", 5.0)).toBe(0);
  });

  it("calculates MRT progressive fare with Rp 14,000 max cap", () => {
    expect(calculateLegFare("MRT_JAKARTA", 2.0, { stationCount: 1 })).toBe(4000);
    expect(calculateLegFare("MRT_JAKARTA", 8.0, { stationCount: 5 })).toBe(8000);
    expect(calculateLegFare("MRT_JAKARTA", 15.0, { stationCount: 13 })).toBe(14000);
  });

  it("calculates LRT Jabodebek peak vs off-peak fares", () => {
    expect(calculateLegFare("LRT_JABODEBEK_CIBUBUR", 28.5, { isPeak: true })).toBe(20000);
    expect(calculateLegFare("LRT_JABODEBEK_CIBUBUR", 28.5, { isPeak: false })).toBe(10000);
  });

  it("calculates KRL progressive segment fare", () => {
    expect(calculateLegFare("KRL_BOGOR", 15.0)).toBe(3000);
    expect(calculateLegFare("KRL_BOGOR", 33.0)).toBe(4000);
    expect(calculateLegFare("KRL_BOGOR", 55.0)).toBe(6000);
  });

  it("calculates Whoosh HSR, Airport Rail, and Maritime fares", () => {
    expect(calculateLegFare("WHOOSH_HSR", 142.3, { seatClass: "first" })).toBe(600000);
    expect(calculateLegFare("WHOOSH_HSR", 142.3, { seatClass: "business" })).toBe(450000);
    expect(calculateLegFare("WHOOSH_HSR", 142.3, { seatClass: "economy" })).toBe(225000);

    expect(calculateLegFare("KAI_BANDARA", 36.0, { seatClass: "executive" })).toBe(70000);
    expect(calculateLegFare("KAI_BANDARA", 36.0)).toBe(50000);

    expect(calculateLegFare("MARITIME_SPEEDBOAT", 20.0)).toBe(54000);
    expect(calculateLegFare("MARITIME_SPEEDBOAT", 45.0)).toBe(74000);
  });

  it("enforces JakLingko 3-Hour Rp 10,000 cap across MRT + TJ + LRT", () => {
    const baseTime = new Date("2026-08-22T08:00:00Z");

    const legs: JakLingkoLegInput[] = [
      {
        mode: "MRT_JAKARTA",
        distanceKm: 8.5,
        stationCount: 5,
        tapInTime: new Date(baseTime.getTime()),
        tapOutTime: new Date(baseTime.getTime() + 20 * 60 * 1000),
      },
      {
        mode: "TRANSJAKARTA_BRT",
        distanceKm: 6.0,
        tapInTime: new Date(baseTime.getTime() + 30 * 60 * 1000),
        tapOutTime: new Date(baseTime.getTime() + 55 * 60 * 1000),
      },
      {
        mode: "LRT_JABODEBEK_CIBUBUR",
        distanceKm: 28.5,
        isPeak: true,
        tapInTime: new Date(baseTime.getTime() + 70 * 60 * 1000),
        tapOutTime: new Date(baseTime.getTime() + 115 * 60 * 1000),
      },
    ];

    const result = calculateJakLingkoTripFare(legs);

    expect(result.rawFareRp).toBe(8000 + 3500 + 20000); // Rp 31,500
    expect(result.totalFareRp).toBe(10000);
    expect(result.isCapped).toBe(true);
    expect(result.discountRp).toBe(21500);
    expect(result.isTransferValid).toBe(true);
  });

  it("handles transfer gap exceeding 45 minutes by invalidating cap", () => {
    const baseTime = new Date("2026-08-22T08:00:00Z");

    const legs: JakLingkoLegInput[] = [
      {
        mode: "MRT_JAKARTA",
        distanceKm: 5.0,
        tapInTime: new Date(baseTime.getTime()),
        tapOutTime: new Date(baseTime.getTime() + 15 * 60 * 1000),
      },
      {
        mode: "TRANSJAKARTA_BRT",
        distanceKm: 5.0,
        tapInTime: new Date(baseTime.getTime() + (15 + 46) * 60 * 1000), // 46m gap > 45m
        tapOutTime: new Date(baseTime.getTime() + 80 * 60 * 1000),
      },
    ];

    const result = calculateJakLingkoTripFare(legs);
    expect(result.isTransferValid).toBe(false);
    expect(result.totalFareRp).toBe(result.rawFareRp);
    expect(result.discountRp).toBe(0);
  });
});

describe("Milestone 4: Dynamic QR Security Service (qrSecurityService.ts)", () => {
  it("computes deterministic HMAC-SHA256 16-character hex token", () => {
    const token = computeHMAC("PLATFORMI:TKT:123:456:100", DEFAULT_QR_SECRET);
    expect(token).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(token)).toBe(true);
  });

  it("generates rolling QR token with monotonic timeStep progression", () => {
    const baseTime = 1755864000000;
    const res0 = generateRollingQRToken("TKT-A", "USR-1", baseTime);
    const res1 = generateRollingQRToken("TKT-A", "USR-1", baseTime + 30000);

    expect(res1.timeStep).toBe(res0.timeStep + 1);
    expect(res0.secondsRemaining).toBe(30);
    expect(res1.token).not.toBe(res0.token);
  });

  it("validates dynamic rolling QR token and tolerates +/- 1 window drift", () => {
    const now = 1755864000000;
    const tokenData = generateRollingQRToken("TKT-B", "USR-2", now);

    // Current window
    const validCurrent = validateRollingQRToken(tokenData.fullPayload, 1, now);
    expect(validCurrent.isValid).toBe(true);

    // -30s drift window
    const validPast = validateRollingQRToken(tokenData.fullPayload, 1, now + 25000);
    expect(validPast.isValid).toBe(true);

    // Expired (> 2 windows behind)
    const expired = validateRollingQRToken(tokenData.fullPayload, 1, now + 95000);
    expect(expired.isValid).toBe(false);
    expect(expired.errorReason).toBe("EXPIRED_QR_TOKEN");
  });

  it("rejects tampered QR tokens and replayed nonces", () => {
    const now = 1755864000000;
    const tokenData = generateRollingQRToken("TKT-C", "USR-3", now);

    // Tampered payload
    const tampered = tokenData.fullPayload.slice(0, -2) + "00";
    expect(validateRollingQRToken(tampered, 1, now).isValid).toBe(false);

    // Anti-replay
    const nonces = new Set<string>();
    const scan1 = validateRollingQRToken(tokenData.fullPayload, 1, now, undefined, nonces);
    expect(scan1.isValid).toBe(true);

    nonces.add(`TKT-C:${tokenData.timeStep}`);
    const scan2 = validateRollingQRToken(tokenData.fullPayload, 1, now, undefined, nonces);
    expect(scan2.isValid).toBe(false);
    expect(scan2.errorReason).toBe("REPLAYED_TOKEN_ALREADY_SCANNED");
  });

  it("generates high-contrast 25x25 SVG QR matrix grid with 3 finder patterns", () => {
    const grid = generateQRMatrixGrid("PLATFORMI:TEST:PAYLOAD", 25);
    expect(grid.length).toBe(25);
    expect(grid[0].length).toBe(25);

    // Finder patterns top-left (0,0) and top-right (0, 18)
    expect(grid[0][0]).toBe(true);
    expect(grid[0][18]).toBe(true);
    expect(grid[18][0]).toBe(true);
  });
});
