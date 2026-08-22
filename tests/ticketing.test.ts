/**
 * Tier 1 & Tier 2 Tests: 30-Second Dynamic Rolling QR Cryptographic Security & Gate Scanner
 * Validates HMAC-SHA256 security token generation, 30s epoch window counters,
 * clock skew drift tolerance (+/- 1 window), anti-tamper, and turnstile gate anti-replay.
 *
 * Rules: Zero placeholder stubs, zero emojis, authentic mathematical rigor.
 */

import { describe, it, expect } from 'vitest';
import {
  generateRollingQRToken,
  validateRollingQRToken,
  computeHMAC,
  TIME_STEP_MS,
  DEFAULT_QR_SECRET,
} from './helpers/domain';

describe('Tier 1: Dynamic Rolling QR Cryptographic Security Models', () => {
  it('generates deterministic HMAC-SHA256 16-character token for given ticket and user', () => {
    const timestamp = 1755864000000; // Fixed test epoch
    const ticketId = 'TKT-MRT-88219';
    const userId = 'USR-JAKARTA-01';

    const result = generateRollingQRToken(ticketId, userId, timestamp);

    expect(result.token).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(result.token)).toBe(true);
    expect(result.timeStep).toBe(Math.floor(timestamp / TIME_STEP_MS));
    expect(result.fullPayload).toBe(`PLATFORMI:${ticketId}:${userId}:${result.timeStep}:${result.token}`);
  });

  it('increments time window counter monotonically every 30,000 milliseconds', () => {
    const baseTime = 1755864000000;
    const window0 = generateRollingQRToken('TKT-1', 'U-1', baseTime);
    const window0Late = generateRollingQRToken('TKT-1', 'U-1', baseTime + 29000);
    const window1 = generateRollingQRToken('TKT-1', 'U-1', baseTime + 30000);
    const window2 = generateRollingQRToken('TKT-1', 'U-1', baseTime + 60000);

    expect(window0.timeStep).toBe(window0Late.timeStep);
    expect(window1.timeStep).toBe(window0.timeStep + 1);
    expect(window2.timeStep).toBe(window0.timeStep + 2);
    expect(window1.token).not.toBe(window0.token); // Token regenerates
  });

  it('computes accurate seconds remaining countdown within 30-second window', () => {
    const baseWindowStart = 1755864000000; // Exact start of a second multiple of 30

    const t0 = generateRollingQRToken('T', 'U', baseWindowStart);
    const t10 = generateRollingQRToken('T', 'U', baseWindowStart + 10000);
    const t29 = generateRollingQRToken('T', 'U', baseWindowStart + 29000);

    expect(t0.secondsRemaining).toBe(30);
    expect(t10.secondsRemaining).toBe(20);
    expect(t29.secondsRemaining).toBe(1);
  });

  it('successfully validates authentic QR token scanned in the current time window', () => {
    const now = Date.now();
    const ticketId = 'TKT-LRT-4412';
    const userId = 'USR-COMMUTER-9';

    const tokenData = generateRollingQRToken(ticketId, userId, now);
    const validation = validateRollingQRToken(tokenData.fullPayload, 1, now);

    expect(validation.isValid).toBe(true);
    expect(validation.ticketId).toBe(ticketId);
    expect(validation.userId).toBe(userId);
    expect(validation.timeStep).toBe(tokenData.timeStep);
    expect(validation.errorReason).toBeUndefined();
  });

  it('accepts valid QR token within +/- 1 window drift tolerance (clock skew)', () => {
    const serverNow = 1755864000000;
    const ticketId = 'TKT-KRL-9901';
    const userId = 'USR-BOGOR-22';

    // Token generated 25 seconds in the past (previous window: serverNow - 30s)
    const pastToken = generateRollingQRToken(ticketId, userId, serverNow - 30000);
    const pastValidation = validateRollingQRToken(pastToken.fullPayload, 1, serverNow);

    // Token generated 25 seconds in future (next window: serverNow + 30s)
    const futureToken = generateRollingQRToken(ticketId, userId, serverNow + 30000);
    const futureValidation = validateRollingQRToken(futureToken.fullPayload, 1, serverNow);

    expect(pastValidation.isValid).toBe(true);
    expect(futureValidation.isValid).toBe(true);
  });
});

describe('Tier 2: Boundary & Corner QR Security Conditions', () => {
  it('rejects expired QR tokens exceeding drift tolerance window', () => {
    const serverNow = 1755864000000;
    const ticketId = 'TKT-EXPIRED-01';
    const userId = 'USR-01';

    // Token generated 90 seconds ago (3 windows behind)
    const expiredToken = generateRollingQRToken(ticketId, userId, serverNow - 90000);
    const validation = validateRollingQRToken(expiredToken.fullPayload, 1, serverNow);

    expect(validation.isValid).toBe(false);
    expect(validation.errorReason).toBe('EXPIRED_QR_TOKEN');
  });

  it('rejects tampered QR tokens with invalid cryptographic signatures', () => {
    const serverNow = Date.now();
    const tokenData = generateRollingQRToken('TKT-REAL', 'USR-REAL', serverNow);

    // Tamper with the HMAC signature
    const tamperedPayload = tokenData.fullPayload.slice(0, -4) + 'abcd';
    const validation = validateRollingQRToken(tamperedPayload, 1, serverNow);

    expect(validation.isValid).toBe(false);
    expect(validation.errorReason).toBe('TAMPERED_QR_TOKEN');
  });

  it('rejects malformed payload strings and corrupted timestamps', () => {
    const serverNow = Date.now();

    const invalidHeader = 'OTHER_SYSTEM:TKT-1:U-1:100:abcdef';
    const missingParts = 'PLATFORMI:TKT-1:U-1';
    const corruptedTimeStep = 'PLATFORMI:TKT-1:U-1:NOT_A_NUMBER:abcdef1234567890';

    expect(validateRollingQRToken(invalidHeader, 1, serverNow).isValid).toBe(false);
    expect(validateRollingQRToken(missingParts, 1, serverNow).errorReason).toBe('INVALID_PAYLOAD_STRUCTURE');
    expect(validateRollingQRToken(corruptedTimeStep, 1, serverNow).errorReason).toBe('CORRUPTED_TIMESTEP');
  });

  it('enforces anti-replay gate protection by rejecting duplicate scans in the same window', () => {
    const serverNow = Date.now();
    const ticketId = 'TKT-REPLAY-99';
    const userId = 'USR-REPLAY-99';
    const tokenData = generateRollingQRToken(ticketId, userId, serverNow);

    const scannedNonces = new Set<string>();

    // First scan -> Valid and records nonce
    const firstScan = validateRollingQRToken(tokenData.fullPayload, 1, serverNow, DEFAULT_QR_SECRET, scannedNonces);
    expect(firstScan.isValid).toBe(true);
    scannedNonces.add(`${ticketId}:${tokenData.timeStep}`);

    // Second scan (replay attempt of screenshot) -> Rejected
    const replayScan = validateRollingQRToken(tokenData.fullPayload, 1, serverNow, DEFAULT_QR_SECRET, scannedNonces);
    expect(replayScan.isValid).toBe(false);
    expect(replayScan.errorReason).toBe('REPLAYED_TOKEN_ALREADY_SCANNED');
  });

  it('manages full turnstile gate transit lifecycle state machine', () => {
    type TicketState = 'ACTIVE' | 'CHECKED_IN' | 'COMPLETED';

    interface GateTicket {
      id: string;
      userId: string;
      state: TicketState;
      tapInStationId?: string;
      tapOutStationId?: string;
    }

    const ticket: GateTicket = {
      id: 'TKT-LIFECYCLE-01',
      userId: 'USR-LIFECYCLE-01',
      state: 'ACTIVE',
    };

    // Tap In at Lebak Bulus
    const tapIn = (t: GateTicket, station: string): { success: boolean; error?: string } => {
      if (t.state !== 'ACTIVE') return { success: false, error: 'TICKET_NOT_ACTIVE' };
      t.state = 'CHECKED_IN';
      t.tapInStationId = station;
      return { success: true };
    };

    // Tap Out at Bundaran HI
    const tapOut = (t: GateTicket, station: string): { success: boolean; error?: string } => {
      if (t.state !== 'CHECKED_IN') return { success: false, error: 'NOT_CHECKED_IN' };
      t.state = 'COMPLETED';
      t.tapOutStationId = station;
      return { success: true };
    };

    expect(tapIn(ticket, 'MRT-LEBAK-BULUS').success).toBe(true);
    expect(ticket.state).toBe('CHECKED_IN');

    // Duplicate tap in while already checked in
    expect(tapIn(ticket, 'MRT-FATMAWATI').success).toBe(false);

    // Tap out
    expect(tapOut(ticket, 'MRT-BUNDARAN-HI').success).toBe(true);
    expect(ticket.state).toBe('COMPLETED');

    // Tap out after completion
    expect(tapOut(ticket, 'MRT-BUNDARAN-HI').success).toBe(false);
  });
});
