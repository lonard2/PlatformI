/**
 * POST /api/ticketing/webhook/[provider] — shared payment webhook entry.
 *
 * Validates the shared envelope, dispatches to the registered provider,
 * and requires an authenticated operator session (PSP signature verification
 * plugs in per provider as adapters land; the manual provider is
 * OCC-confirmed, so the operator session IS the authentication).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseWebhookEnvelope,
  type TicketUpdate,
} from "@/lib/ticketing/paymentProvider";
import {
  MANUAL_PROVIDER_ID,
  createManualSettlementProvider,
} from "@/lib/ticketing/manualSettlementProvider";
import { requireOperator } from "@/lib/services/adminAuthService";

const manual = createManualSettlementProvider();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "MALFORMED_ENVELOPE" }, { status: 400 });
  }
  const parsed = parseWebhookEnvelope(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  if (parsed.value.provider !== provider || provider !== MANUAL_PROVIDER_ID) {
    return NextResponse.json({ success: false, error: "UNKNOWN_PROVIDER" }, { status: 404 });
  }

  const operator = requireOperator(request.headers.get("cookie"));
  if (!operator) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { event, payload } = parsed.value;
  if (event !== "payment.confirmed" && event !== "payment.refunded") {
    return NextResponse.json({ success: false, error: "UNKNOWN_EVENT" }, { status: 400 });
  }
  const paymentRef = typeof payload.paymentRef === "string" ? payload.paymentRef.trim() : "";
  if (!paymentRef) {
    return NextResponse.json({ success: false, error: "MISSING_PAYMENT_REF" }, { status: 400 });
  }

  const ticket = await db.ticket.findFirst({ where: { paymentRef } });
  if (!ticket) {
    return NextResponse.json({ success: false, error: "TICKET_NOT_FOUND" }, { status: 404 });
  }

  let update: TicketUpdate;
  try {
    if (event === "payment.confirmed") {
      const proof = typeof payload.proof === "string" ? payload.proof : undefined;
      update = manual.confirmPayment({
        paymentRef,
        proof,
        actor: operator,
        current: ticket.paymentStatus === "PAID" ? { paymentStatus: "PAID" } : undefined,
      });
    } else {
      const reason = typeof payload.reason === "string" ? payload.reason : "";
      update = manual.refundPayment({
        paymentRef,
        reason,
        actor: operator,
        current: { paymentStatus: ticket.status === "REFUNDED" ? "REFUNDED" : ticket.paymentStatus, gateConsumed: ticket.gateScannedAt !== null },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "WEBHOOK_FAILED";
    const status = /FORBIDDEN/.test(message) ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }

  const data: Record<string, unknown> = { paymentStatus: update.paymentStatus };
  if (update.paidAt !== undefined) data.paidAt = update.paidAt;
  if (update.paymentRef !== undefined) data.paymentRef = update.paymentRef;
  if (update.paymentMethod !== undefined) data.paymentMethod = update.paymentMethod;
  if (update.refundedAt !== undefined) data.refundedAt = update.refundedAt;
  if (update.refundReason !== undefined) data.refundReason = update.refundReason;

  const nextTicket = await db.ticket.update({ where: { id: ticket.id }, data });
  return NextResponse.json({
    success: true,
    data: {
      id: nextTicket.id,
      ticketNumber: nextTicket.ticketNumber,
      paymentStatus: nextTicket.paymentStatus,
      paidAt: nextTicket.paidAt?.toISOString() ?? null,
    },
  });
}
