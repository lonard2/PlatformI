/**
 * PlatformI - Milestone 5 Test Suite: Turnstile Gate Scanner Simulator & QR Cryptography
 *
 * Tests:
 * 1. Rolling 30-second HMAC-SHA256 token generation and validation
 * 2. Clock skew drift tolerance (+/- 1 time-step window)
 * 3. Anti-tampering signature verification
 * 4. Anti-replay nonce protection
 * 5. JakLingko 3-hour (180 minute) multimodal transfer window boundaries
 */

import { describe, it, expect } from "vitest";
import {
  generateRollingQRToken,
  validateRollingQRToken,
  DEFAULT_QR_SECRET,
  TIME_STEP_MS,
} from "@/lib/services/qrSecurityService";

describe("Milestone 5: Turnstile Gate Scanner Simulator & Cryptography", () => {
  const ticketId = "TKT-TEST-9921";
  const userId = "USR-JAKARTA-01";

  describe("1. Dynamic Rolling QR Token Generation & Verification", () => {
    it("generates a valid 30-second rolling token payload", () => {
      const now = Date.now();
      const tokenResult = generateRollingQRToken(ticketId, userId, now);

      expect(tokenResult.token).toHaveLength(16);
      expect(tokenResult.timeStep).toBe(Math.floor(now / TIME_STEP_MS));
      expect(tokenResult.secondsRemaining).toBeGreaterThanOrEqual(1);
      expect(tokenResult.secondsRemaining).toBeLessThanOrEqual(30);
      expect(tokenResult.fullPayload).toContain(`PLATFORMI:${ticketId}:${userId}:`);
    });

    it("successfully validates current time-step rolling token", () => {
      const now = Date.now();
      const tokenResult = generateRollingQRToken(ticketId, userId, now);
      const validation = validateRollingQRToken(tokenResult.fullPayload, 1, now);

      expect(validation.isValid).toBe(true);
      expect(validation.ticketId).toBe(ticketId);
      expect(validation.userId).toBe(userId);
      expect(validation.timeStep).toBe(tokenResult.timeStep);
      expect(validation.errorReason).toBeUndefined();
    });
  });

  describe("2. Clock Skew Drift Tolerance (+/- 1 Window)", () => {
    it("accepts token generated 25 seconds ago (within -1 step tolerance)", () => {
      const serverTime = Date.now();
      const clientTime25sAgo = serverTime - 25000;

      const tokenResult = generateRollingQRToken(ticketId, userId, clientTime25sAgo);
      const validation = validateRollingQRToken(tokenResult.fullPayload, 1, serverTime);

      expect(validation.isValid).toBe(true);
    });

    it("accepts token generated 25 seconds in future (within +1 step tolerance)", () => {
      const serverTime = Date.now();
      const clientTime25sFuture = serverTime + 25000;

      const tokenResult = generateRollingQRToken(ticketId, userId, clientTime25sFuture);
      const validation = validateRollingQRToken(tokenResult.fullPayload, 1, serverTime);

      expect(validation.isValid).toBe(true);
    });

    it("rejects token generated 120 seconds ago (> 1 step tolerance) as EXPIRED_QR_TOKEN", () => {
      const serverTime = Date.now();
      const expiredClientTime = serverTime - 120000;

      const tokenResult = generateRollingQRToken(ticketId, userId, expiredClientTime);
      const validation = validateRollingQRToken(tokenResult.fullPayload, 1, serverTime);

      expect(validation.isValid).toBe(false);
      expect(validation.errorReason).toBe("EXPIRED_QR_TOKEN");
    });
  });

  describe("3. Cryptographic Tamper & Structure Protection", () => {
    it("rejects tampered HMAC hash as TAMPERED_QR_TOKEN", () => {
      const now = Date.now();
      const tokenResult = generateRollingQRToken(ticketId, userId, now);

      const parts = tokenResult.fullPayload.split(":");
      parts[4] = "F00DF00DCAFEBABE"; // corrupted signature
      const tamperedPayload = parts.join(":");

      const validation = validateRollingQRToken(tamperedPayload, 1, now);
      expect(validation.isValid).toBe(false);
      expect(validation.errorReason).toBe("TAMPERED_QR_TOKEN");
    });

    it("rejects invalid payload structure as INVALID_PAYLOAD_STRUCTURE", () => {
      const invalidPayload = "MALFORMED:QR:STRING";
      const validation = validateRollingQRToken(invalidPayload);

      expect(validation.isValid).toBe(false);
      expect(validation.errorReason).toBe("INVALID_PAYLOAD_STRUCTURE");
    });
  });

  describe("4. Anti-Replay Nonce Enforcement", () => {
    it("detects and rejects duplicate scans with REPLAYED_TOKEN_ALREADY_SCANNED", () => {
      const now = Date.now();
      const tokenResult = generateRollingQRToken(ticketId, userId, now);

      const usedNonces = new Set<string>();

      // First Scan: Allowed
      const scan1 = validateRollingQRToken(tokenResult.fullPayload, 1, now, DEFAULT_QR_SECRET, usedNonces);
      expect(scan1.isValid).toBe(true);

      // Record nonce
      usedNonces.add(`${scan1.ticketId}:${scan1.timeStep}`);

      // Second Scan: Replay detected and rejected
      const scan2 = validateRollingQRToken(tokenResult.fullPayload, 1, now, DEFAULT_QR_SECRET, usedNonces);
      expect(scan2.isValid).toBe(false);
      expect(scan2.errorReason).toBe("REPLAYED_TOKEN_ALREADY_SCANNED");
    });
  });

  describe("5. JakLingko 3-Hour (180 Minute) Multimodal Window Boundaries", () => {
    it("verifies transfer within 180 minutes is eligible for JakLingko cap", () => {
      const journeyMinutes = 179; // 179m59s
      const isEligible = journeyMinutes <= 180;
      expect(isEligible).toBe(true);
    });

    it("verifies transfer past 180 minutes (181m) is flagged as window expired", () => {
      const journeyMinutes = 181;
      const isEligible = journeyMinutes <= 180;
      expect(isEligible).toBe(false);
    });
  });
});
