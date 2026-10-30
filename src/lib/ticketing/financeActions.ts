/**
 * PlatformI - Shared money-movement actions.
 *
 * Single implementation behind every confirm/refund entry point (finance
 * API routes, the legacy scanner refund route, the manual webhook branch).
 * Callers own authorization (requireOperator / requireFinanceRole); these
 * functions own the business rules and the audit fields.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */
import { db } from "@/lib/db";
import { createManualSettlementProvider } from "@/lib/ticketing/manualSettlementProvider";

const manual = createManualSettlementProvider();

export class FinanceError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

function mapProviderError(err: unknown): FinanceError {
  const code = err instanceof Error ? err.message : String(err);
  if (code === "FORBIDDEN_NOT_FINANCE") return new FinanceError(code, 403);
  if (code === "MISSING_PAYMENT_REF" || code === "MISSING_REFUND_REASON") {
    return new FinanceError(code, 400);
  }
  if (code === "ALREADY_REFUNDED") return new FinanceError(code, 409);
  if (code === "GATE_CONSUMED_NOT_REFUNDABLE") {
    return new FinanceError("GATE_CONSUMED", 409, code);
  }
  if (err instanceof FinanceError) return err;
  return new FinanceError("PROVIDER_FAILED", 500, code);
}

async function findTicket(input: { ticketNumber?: string; id?: string; paymentRef?: string }) {
  const ticketNumber = (input.ticketNumber ?? "").trim();
  const id = (input.id ?? "").trim();
  const paymentRef = (input.paymentRef ?? "").trim();
  const ticket = ticketNumber
    ? await db.ticket.findUnique({ where: { ticketNumber } })
    : id
      ? await db.ticket.findUnique({ where: { id } })
      : paymentRef
        ? await db.ticket.findFirst({ where: { paymentRef } })
        : null;
  if (!ticket) throw new FinanceError("TICKET_NOT_FOUND", 404);
  return ticket;
}

export interface ConfirmTicketPaymentInput {
  ticketNumber?: string;
  id?: string;
  paymentRef?: string;
  proof?: string;
  actorId: string;
  actorRole: string;
}

export async function confirmTicketPayment(input: ConfirmTicketPaymentInput) {
  const ticket = await findTicket(input);
  if (ticket.paymentStatus === "PAID") return { ticket, idempotent: true as const };
  if (ticket.paymentStatus === "REFUNDED" || ticket.status === "REFUNDED") {
    throw new FinanceError("ALREADY_REFUNDED", 409);
  }
  let paymentRef = (input.paymentRef ?? "").trim() || ticket.paymentRef || "";
  if (!paymentRef) {
    paymentRef = createManualSettlementProvider().createCharge({
      amountRp: ticket.totalFareRp,
      ticketNumber: ticket.ticketNumber,
      reservationCode: ticket.reservationCode,
    }).paymentRef;
  }
  const update = (() => {
    try {
      return manual.confirmPayment({
        paymentRef,
        proof: input.proof,
        actor: { id: input.actorId, role: input.actorRole },
        current: { paymentStatus: ticket.paymentStatus },
      });
    } catch (err) {
      throw mapProviderError(err);
    }
  })();
  if (update.paymentStatus !== "PAID" || !update.paidAt) {
    throw new FinanceError("CONFIRM_FAILED", 500);
  }
  const updated = await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "ACTIVE",
      paymentStatus: "PAID",
      paidAt: update.paidAt,
      paymentRef,
      paymentMethod: "manual",
      confirmedBy: input.actorId,
    },
  });
  return { ticket: updated, idempotent: false as const };
}

export interface RefundTicketPaymentInput {
  ticketNumber?: string;
  id?: string;
  reason?: string;
  actorId: string;
  actorRole: string;
}

export async function refundTicketPayment(input: RefundTicketPaymentInput) {
  const ticket = await findTicket(input);
  if (ticket.paymentStatus === "REFUNDED" || ticket.status === "REFUNDED") {
    return { ticket, idempotent: true as const };
  }
  if (ticket.status === "COMPLETED" || ticket.gateScannedAt !== null) {
    throw new FinanceError("GATE_CONSUMED", 409, "Ticket already used at the gate and cannot be refunded");
  }
  const reason = (input.reason ?? "").trim();
  if (!reason) throw new FinanceError("MISSING_REFUND_REASON", 400);
  let update;
  try {
    update = manual.refundPayment({
      paymentRef: ticket.paymentRef ?? ticket.ticketNumber,
      reason,
      actor: { id: input.actorId, role: input.actorRole },
      current: { paymentStatus: ticket.paymentStatus, gateConsumed: false },
    });
  } catch (err) {
    throw mapProviderError(err);
  }
  const updated = await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
      refundedAt: update.refundedAt,
      refundReason: update.refundReason,
      refundedBy: input.actorId,
    },
  });
  return { ticket: updated, idempotent: false as const };
}
