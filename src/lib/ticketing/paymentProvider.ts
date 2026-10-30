/**
 * PlatformI - Payment provider abstraction.
 *
 * Every money movement goes through a PaymentProvider so settlement methods
 * are interchangeable: the manual (OCC-confirmed) provider ships first and
 * PSP adapters (Midtrans/Xendit/Stripe) implement this same interface later
 * without touching lifecycle code, the webhook route, or the UI.
 *
 * Providers are pure with respect to persistence: they validate and compute
 * TicketUpdate objects; route handlers own all database writes.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

export const FINANCE_ROLES = ["FINANCE_OFFICER", "FINANCE_SUPERVISOR"] as const;
export type FinanceRole = (typeof FINANCE_ROLES)[number];

export interface PaymentActor {
  id: string;
  role: string;
}

export interface TicketMoneyState {
  paymentStatus: string;
  paidAt?: Date | string | null;
  consumed?: boolean;
}

export interface TicketUpdate {
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  paidAt?: Date;
  paymentRef?: string;
  paymentMethod?: string;
  refundedAt?: Date;
  refundReason?: string;
}

export interface ChargeRequest {
  amountRp: number;
  ticketNumber: string;
  reservationCode: string;
  buyerName?: string;
  buyerPhone?: string;
}

export interface ChargeResult {
  paymentRef: string;
  instructions: string;
  amountRp: number;
  expiresAt: Date;
}

export interface ConfirmPaymentInput {
  paymentRef: string;
  proof?: string;
  actor: PaymentActor;
  current?: TicketMoneyState;
}

export interface RefundPaymentInput {
  paymentRef: string;
  reason: string;
  actor: PaymentActor;
  current: TicketMoneyState & { gateConsumed: boolean };
}

export interface PaymentProvider {
  readonly id: string;
  createCharge(input: ChargeRequest): ChargeResult;
  confirmPayment(input: ConfirmPaymentInput): TicketUpdate;
  refundPayment(input: RefundPaymentInput): TicketUpdate;
}

export function isFinanceActor(actor: Pick<PaymentActor, "role">): boolean {
  return (FINANCE_ROLES as readonly string[]).includes(actor.role);
}

/** Shared webhook envelope every provider must speak. */
export interface WebhookEnvelope {
  provider: string;
  event: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export function parseWebhookEnvelope(
  body: unknown
): { ok: true; value: WebhookEnvelope } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "MALFORMED_ENVELOPE" };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.provider !== "string" || record.provider.trim() === "") {
    return { ok: false, error: "MISSING_PROVIDER" };
  }
  if (typeof record.event !== "string" || record.event.trim() === "") {
    return { ok: false, error: "MISSING_EVENT" };
  }
  if (typeof record.payload !== "object" || record.payload === null || Array.isArray(record.payload)) {
    return { ok: false, error: "MISSING_PAYLOAD" };
  }
  const envelope: WebhookEnvelope = {
    provider: record.provider,
    event: record.event,
    payload: record.payload as Record<string, unknown>,
  };
  if (typeof record.signature === "string") {
    envelope.signature = record.signature;
  }
  return { ok: true, value: envelope };
}
