/**
 * PlatformI - Operator & OCC Dispatcher Authentication Service
 *
 * Implements:
 * - Isomorphic HMAC-SHA256 signed session tokens for operator authorization
 *   (Runs in Next.js Edge Middleware, Serverless Node.js Route Handlers, and Browsers)
 * - Shift-based token expiration (default 8 hours)
 * - Credential verification for OCC Dispatchers and Administrators
 * - Constant-time comparison for tamper detection & anti-timing attacks
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

export interface OperatorProfile {
  id: string;
  name: string;
  role: "CHIEF_DISPATCHER" | "LINE_CONTROLLER" | "TELEMETRY_ENGINEER" | "SECURITY_AUDITOR";
  stationHub: string;
  badgeNumber: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  operatorId?: string;
  role?: string;
  error?: "MISSING_TOKEN" | "MALFORMED_TOKEN" | "INVALID_SIGNATURE" | "TOKEN_EXPIRED";
}

/**
 * Resolves the HMAC signing secret with fail-closed enforcement in production.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY ERROR: ADMIN_AUTH_SECRET or NEXTAUTH_SECRET environment variable is missing in production environment. Server refuses to operate with fallback secret."
      );
    }
    return "xpo-development-secret-key-32-chars-minimum-length-key";
  }
  return secret;
}

export const DEFAULT_AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.ADMIN_AUTH_SECRET ||
  "xpo-development-secret-key-32-chars-minimum-length-key";

export const OPERATOR_COOKIE_NAME = "platformi_operator_session";
export const SHIFT_DURATION_SECONDS = 8 * 60 * 60; // 8-hour operator shift

// Authentic OCC Dispatcher accounts catalog (Server-side credential store)
export const REGISTERED_OPERATORS: Record<
  string,
  { passkey: string; profile: OperatorProfile }
> = {
  "OCC-DKA-01": {
    passkey: "transitopps2026",
    profile: {
      id: "OCC-DKA-01",
      name: "Raden Budi Santoso",
      role: "CHIEF_DISPATCHER",
      stationHub: "Dukuh Atas Integrated OCC Hub",
      badgeNumber: "OCC-2026-8801",
    },
  },
  "OCC-MRT-02": {
    passkey: "mrtjakarta2026",
    profile: {
      id: "OCC-MRT-02",
      name: "Siti Rahmawati",
      role: "LINE_CONTROLLER",
      stationHub: "Lebak Bulus Depot OCC",
      badgeNumber: "MRT-OCC-0412",
    },
  },
  "OCC-ADMIN": {
    passkey: "admin123",
    profile: {
      id: "OCC-ADMIN",
      name: "Lead Systems Administrator",
      role: "SECURITY_AUDITOR",
      stationHub: "Central Transit Operations Command",
      badgeNumber: "SYS-ADMIN-0001",
    },
  },
};

// Client-safe operator presets live in adminPresetOperators.ts — keeping
// them in this module would ship the plaintext passkey catalog to the browser.

// ==========================================
// ISOMORPHIC SHA-256 & HMAC-SHA256
// ==========================================

const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function stringToUtf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    } else {
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  const l = data.length;
  const bitLen = l * 8;
  const k = (56 - ((l + 1) % 64) + 64) % 64;
  const padded = new Uint8Array(l + 1 + k + 8);
  padded.set(data);
  padded[l] = 0x80;

  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(padded.length - 8, highBits, false);
  view.setUint32(padded.length - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const resView = new DataView(result.buffer, result.byteOffset, result.byteLength);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  resView.setUint32(20, h5, false);
  resView.setUint32(24, h6, false);
  resView.setUint32(28, h7, false);
  return result;
}

function hmacSha256(keyBytes: Uint8Array, messageBytes: Uint8Array): Uint8Array {
  const blockSize = 64;
  let key = keyBytes;
  if (key.length > blockSize) {
    key = sha256Bytes(key);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + messageBytes.length);
  innerMsg.set(iKeyPad);
  innerMsg.set(messageBytes, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + innerHash.length);
  outerMsg.set(oKeyPad);
  outerMsg.set(innerHash, blockSize);
  return sha256Bytes(outerMsg);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Computes HMAC-SHA256 signature for token payload
 */
export function computeOperatorSignature(data: string, secret?: string): string {
  const effectiveSecret = secret || getAuthSecret();
  const keyBytes = stringToUtf8Bytes(effectiveSecret);
  const msgBytes = stringToUtf8Bytes(data);
  const hashBytes = hmacSha256(keyBytes, msgBytes);
  return bytesToHex(hashBytes).slice(0, 32);
}

/**
 * Constant-time string equality comparison to eliminate timing attack vectors
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates a signed operator session token
 * Format: OCC:<operatorId>:<role>:<timestampEpochSeconds>:<signature>
 */
export function createOperatorSessionToken(
  operatorId: string,
  role: string = "CHIEF_DISPATCHER",
  secret?: string,
  nowEpochSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const effectiveSecret = secret || getAuthSecret();
  const payload = `OCC:${operatorId}:${role}:${nowEpochSeconds}`;
  const signature = computeOperatorSignature(payload, effectiveSecret);
  return `${payload}:${signature}`;
}

/**
 * Validates an operator session token with expiration and tamper checks
 */
export function verifyOperatorSessionToken(
  token: string | null | undefined,
  maxAgeSeconds: number = SHIFT_DURATION_SECONDS,
  nowEpochSeconds: number = Math.floor(Date.now() / 1000),
  secret?: string
): AuthValidationResult {
  if (!token || typeof token !== "string") {
    return { isValid: false, error: "MISSING_TOKEN" };
  }

  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "OCC") {
    return { isValid: false, error: "MALFORMED_TOKEN" };
  }

  const [, operatorId, role, timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (Number.isNaN(timestamp)) {
    return { isValid: false, error: "MALFORMED_TOKEN" };
  }

  let effectiveSecret: string;
  try {
    effectiveSecret = secret || getAuthSecret();
  } catch {
    return { isValid: false, error: "INVALID_SIGNATURE" };
  }

  const payload = `OCC:${operatorId}:${role}:${timestampStr}`;
  const expectedSignature = computeOperatorSignature(payload, effectiveSecret);

  if (!constantTimeEqual(providedSignature, expectedSignature)) {
    return { isValid: false, error: "INVALID_SIGNATURE" };
  }

  // Expiration check
  if (nowEpochSeconds - timestamp > maxAgeSeconds) {
    return { isValid: false, error: "TOKEN_EXPIRED" };
  }

  return {
    isValid: true,
    operatorId,
    role,
  };
}

/**
 * Verifies credentials against registered operators catalog
 */
export function authenticateOperator(
  operatorId: string,
  passkey: string
): { success: boolean; profile?: OperatorProfile; token?: string; error?: string } {
  const normalizedId = operatorId.trim().toUpperCase();
  const operator = REGISTERED_OPERATORS[normalizedId];

  if (!operator || !constantTimeEqual(operator.passkey, passkey.trim())) {
    return {
      success: false,
      error: "Invalid Operator ID or Passkey. Please verify credentials.",
    };
  }

  const token = createOperatorSessionToken(operator.profile.id, operator.profile.role);

  return {
    success: true,
    profile: operator.profile,
    token,
  };
}
