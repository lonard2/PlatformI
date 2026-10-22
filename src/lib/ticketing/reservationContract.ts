/**
 * PlatformI - Reservation contract shared by ticketing APIs and the intercity hub.
 *
 * Documents and validates the intercity stop model: city tickets reference
 * real stop IDs, while intercity runs reference virtual stop IDs of the form
 * INTERCITY:<runId>:ORIGIN and INTERCITY:<runId>:DESTINATION. Virtual refs
 * are only valid when both endpoints embed the same run id and the purchase
 * carries that run identity (runId or tripCode). Intercity legs are
 * fare-priced, so distanceKm is optional and never validated as real.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TicketStatus } from "@/types/transit";

/** userId marker for logged-out purchases awaiting claim on later login. */
export const GUEST_USER_ID = "guest";

/**
 * Canonical virtual stop reference for intercity runs.
 * Legacy hub payloads used lowercase `intercity:<id>:origin`; they are
 * normalized to this canonical form before validation.
 */
export const INTERCITY_STOP_PATTERN = /^INTERCITY:([A-Za-z0-9_-]+):(ORIGIN|DESTINATION)$/;

export type PaymentResult = "success" | "failed" | "pending";

export interface ReservationBuyerInput {
  fullName?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
}

export interface ReservationLegInput {
  legIndex: number;
  lineId: string;
  originStopId: string;
  destinationStopId: string;
  mode: string;
  fareRp: number;
  distanceKm?: number;
}

export interface ReservationTripMeta {
  tripCode?: string;
  runId?: string;
  travelDate?: string;
  meal?: string;
  dropOffPointId?: string;
  /** Buyer full name persisted here; the Ticket row has no buyer-name column. */
  buyerFullName?: string;
}

export interface StoredReservationEnvelope {
  version: 1;
  legs: ReservationLegInput[];
  trip: ReservationTripMeta;
}

export function buildReservationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RSV-${suffix}`;
}

export function buildTicketNumber(prefix = "TKT"): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${rand}-${Date.now().toString().slice(-4)}`;
}

/**
 * Maps payment outcome plus buyer identity to a reservation status.
 * Logged-out (guest) purchases without an explicit success stay WAITING;
 * authenticated city purchases without a payment flag stay ACTIVE.
 */
export function resolveReservationStatus(options: {
  paymentResult?: string;
  userId?: string;
  hasBuyerContact?: boolean;
}): TicketStatus {
  if (options.paymentResult === "success") return "ACTIVE";
  if (options.paymentResult === "failed") return "FAILED";
  const userId = (options.userId ?? "").trim();
  if (userId === "" || userId === GUEST_USER_ID || options.hasBuyerContact === true) {
    return "WAITING";
  }
  return "ACTIVE";
}

/** Normalizes legacy lowercase hub refs to the canonical virtual form. */
export function normalizeStopRef(ref: string): string {
  const match = /^intercity:([A-Za-z0-9_-]+):(origin|destination)$/i.exec(ref.trim());
  if (match) {
    return `INTERCITY:${match[1]}:${match[2].toUpperCase()}`;
  }
  return ref.trim();
}

export function parseIntercityStopRef(ref: string): { runId: string; endpoint: string } | null {
  const match = INTERCITY_STOP_PATTERN.exec(ref);
  if (!match) return null;
  return { runId: match[1], endpoint: match[2] };
}

/**
 * Validates origin/destination stop references. Returns an English error
 * message or null when valid. Virtual intercity refs must share one run id
 * that matches the purchase run identity; mixing virtual refs from two runs
 * or pairing origin with origin is rejected.
 */
export function validateStopRefs(options: {
  originStopId: string;
  destinationStopId: string;
  runId?: string;
  tripCode?: string;
}): string | null {
  const origin = normalizeStopRef(options.originStopId ?? "");
  const destination = normalizeStopRef(options.destinationStopId ?? "");
  if (origin === "" || destination === "") {
    return "Missing required fields: originStopId, destinationStopId";
  }
  if (origin === destination) {
    return "Origin and destination stops must differ";
  }
  const originVirtual = parseIntercityStopRef(origin);
  const destinationVirtual = parseIntercityStopRef(destination);
  if (originVirtual === null && destinationVirtual === null) {
    return null;
  }
  if ((originVirtual === null) !== (destinationVirtual === null)) {
    return "City stops and intercity virtual stops must not be mixed in one reservation";
  }
  if (originVirtual !== null && destinationVirtual !== null) {
    if (originVirtual.runId !== destinationVirtual.runId) {
      return "Intercity origin and destination must reference the same run";
    }
    if (originVirtual.endpoint === destinationVirtual.endpoint) {
      return "Intercity origin and destination must be opposite endpoints";
    }
    const runIdentity = (options.runId ?? "").trim();
    const tripIdentity = (options.tripCode ?? "").trim();
    if (runIdentity === "" && tripIdentity === "") {
      return "Intercity reservations require runId or tripCode";
    }
    if (runIdentity !== "" && runIdentity !== originVirtual.runId) {
      return "Intercity stop references do not match runId";
    }
  }
  return null;
}

/** Type guard for a single stored leg; drops malformed entries. */
function toSafeLeg(value: unknown): ReservationLegInput | null {
  if (value === null || typeof value !== "object") return null;
  const leg = value as Partial<ReservationLegInput>;
  if (typeof leg.lineId !== "string" || typeof leg.mode !== "string") return null;
  if (typeof leg.originStopId !== "string" || typeof leg.destinationStopId !== "string") {
    return null;
  }
  if (typeof leg.fareRp !== "number" || !Number.isFinite(leg.fareRp)) return null;
  return {
    legIndex: typeof leg.legIndex === "number" ? leg.legIndex : 0,
    lineId: leg.lineId,
    originStopId: leg.originStopId,
    destinationStopId: leg.destinationStopId,
    mode: leg.mode,
    fareRp: leg.fareRp,
    distanceKm: typeof leg.distanceKm === "number" ? leg.distanceKm : undefined,
  };
}

function toSafeTripMeta(value: unknown): ReservationTripMeta {
  if (value === null || typeof value !== "object") return {};
  const trip = value as Partial<ReservationTripMeta>;
  const pick = (field: keyof ReservationTripMeta): string | undefined => {
    const raw = trip[field];
    return typeof raw === "string" && raw.trim() !== "" ? raw : undefined;
  };
  return {
    tripCode: pick("tripCode"),
    runId: pick("runId"),
    travelDate: pick("travelDate"),
    meal: pick("meal"),
    dropOffPointId: pick("dropOffPointId"),
    buyerFullName: pick("buyerFullName"),
  };
}

/** Parses legsJson written either as a legacy array or a versioned envelope. */
export function readReservationEnvelope(raw: string): StoredReservationEnvelope {
  const fallback: StoredReservationEnvelope = {
    version: 1,
    legs: [],
    trip: {},
  };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        version: 1,
        legs: parsed.map(toSafeLeg).filter((leg): leg is ReservationLegInput => leg !== null),
        trip: {},
      };
    }
    if (parsed !== null && typeof parsed === "object") {
      const record = parsed as { legs?: unknown; trip?: unknown };
      const legs = Array.isArray(record.legs)
        ? record.legs.map(toSafeLeg).filter((leg): leg is ReservationLegInput => leg !== null)
        : [];
      return { version: 1, legs, trip: toSafeTripMeta(record.trip) };
    }
  } catch {
    // Malformed payload: treat as empty reservation envelope.
  }
  return fallback;
}

export function writeReservationEnvelope(
  legs: ReservationLegInput[],
  trip: ReservationTripMeta
): string {
  const envelope: StoredReservationEnvelope = { version: 1, legs, trip };
  return JSON.stringify(envelope);
}

/**
 * Validates every leg of a reservation: each leg carries usable line/mode
 * refs, leg endpoints run through the same stop-ref rules as the top-level
 * endpoints, legs chain without gaps, and the first origin plus last
 * destination match the reservation endpoints. Returns an English error
 * message or null when valid.
 */
export function validateReservationLegs(
  legs: ReservationLegInput[],
  topOriginStopId: string,
  topDestinationStopId: string,
  options: { runId?: string; tripCode?: string } = {}
): string | null {
  if (legs.length === 0) return null;
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index];
    if (leg.lineId.trim() === "" || leg.mode.trim() === "") {
      return `Leg ${index} must include lineId and mode`;
    }
    if (!Number.isFinite(leg.fareRp) || leg.fareRp < 0) {
      return `Leg ${index} fareRp must be a non-negative number`;
    }
    const legError = validateStopRefs({
      originStopId: leg.originStopId,
      destinationStopId: leg.destinationStopId,
      runId: options.runId,
      tripCode: options.tripCode,
    });
    if (legError) {
      return `Leg ${index}: ${legError}`;
    }
    if (index > 0 && leg.originStopId !== legs[index - 1].destinationStopId) {
      return `Leg ${index} must start where leg ${index - 1} ends`;
    }
  }
  if (legs[0].originStopId !== topOriginStopId) {
    return "First leg origin must match the reservation origin";
  }
  if (legs[legs.length - 1].destinationStopId !== topDestinationStopId) {
    return "Last leg destination must match the reservation destination";
  }
  return null;
}

export interface GuestTicketView {
  ticketNumber: string;
  reservationCode: string;
  status: TicketStatus;
  originStopId: string;
  destinationStopId: string;
  seatId: string | null;
  serviceClass: string | null;
  buyerFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  travelDate: string | null;
  tripCode: string | null;
  createdAt: string;
  expiresAt: string;
}

interface SanitizableTicket {
  ticketNumber: string;
  reservationCode: string;
  status: string;
  originStopId: string;
  destinationStopId: string;
  seatId: string | null;
  serviceClass: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  legsJson: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Projects a stored ticket to the guest-safe view. Payment fields
 * (totalFareRp, isJakLingkoCapped), the rolling QR token, user identity,
 * and gate scan timestamps are never exposed here.
 */
export function sanitizeGuestTicket(record: SanitizableTicket): GuestTicketView {
  const envelope = readReservationEnvelope(record.legsJson);
  return {
    ticketNumber: record.ticketNumber,
    reservationCode: record.reservationCode,
    status: record.status as TicketStatus,
    originStopId: record.originStopId,
    destinationStopId: record.destinationStopId,
    seatId: record.seatId,
    serviceClass: record.serviceClass,
    buyerFullName: envelope.trip.buyerFullName ?? null,
    guestEmail: record.guestEmail,
    guestPhone: record.guestPhone,
    travelDate: envelope.trip.travelDate ?? null,
    tripCode: envelope.trip.tripCode ?? null,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  };
}

/**
 * Rejects terminal ticket states at gate validation. Returns the machine
 * reason code or null when the ticket may proceed to QR/token checks.
 */
export function ticketStateReason(
  status: string,
  expiresAt: Date,
  now: Date = new Date()
): string | null {
  if (status === "REFUNDED") return "TICKET_REFUNDED";
  if (status === "FAILED") return "TICKET_FAILED";
  if (status === "CANCELLED") return "TICKET_CANCELLED";
  if (expiresAt.getTime() <= now.getTime() || status === "EXPIRED") {
    return "TICKET_EXPIRED";
  }
  return null;
}
