/**
 * POST /api/ticketing/webhook/[provider] — shared payment webhook entry.
 *
 * Validates the shared envelope, dispatches to the registered provider
 * through the shared finance actions, and requires an authenticated
 * operator: PSP signature verification plugs in per provider as adapters
 * land; the manual provider is OCC-confirmed, so the operator session IS
 * the authentication. Finance role gating applies to both directions.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseWebhookEnvelope } from "@/lib/ticketing/paymentProvider";
import { MANUAL_PROVIDER_ID } from "@/lib/ticketing/manualSettlementProvider";
import { requireFinanceRole } from "@/lib/services/adminAuthService";
import { confirmTicketPayment, refundTicketPayment, FinanceError } from "@/lib/ticketing/financeActions";

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

  const { event, payload } = parsed.value;
  if (event !== "payment.confirmed" && event !== "payment.refunded") {
    return NextResponse.json({ success: false, error: "UNKNOWN_EVENT" }, { status: 400 });
  }

  // Authenticate before business-field validation so unauthenticated callers
  // always see 401/403, never field-level errors. The refund direction
  // re-checks the supervisor threshold after loading the stored amount.
  const baseGate =
    event === "payment.confirmed"
      ? requireFinanceRole(request.headers.get("cookie"), "confirm")
      : requireFinanceRole(request.headers.get("cookie"), "refund");
  if (!baseGate.ok) {
    return NextResponse.json({ success: false, error: baseGate.error }, { status: baseGate.status });
  }

  const paymentRef = typeof payload.paymentRef === "string" ? payload.paymentRef.trim() : "";
  if (!paymentRef) {
    return NextResponse.json({ success: false, error: "MISSING_PAYMENT_REF" }, { status: 400 });
  }

  try {
    if (event === "payment.confirmed") {
      const proof = typeof payload.proof === "string" ? payload.proof : undefined;
      const { ticket, idempotent } = await confirmTicketPayment({
        paymentRef,
        proof,
        actorId: baseGate.id,
        actorRole: baseGate.role,
      });
      return NextResponse.json({
        success: true,
        idempotent,
        data: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          paymentStatus: ticket.paymentStatus,
          paidAt: ticket.paidAt?.toISOString() ?? null,
        },
      });
    }

    const reason = typeof payload.reason === "string" ? payload.reason : "";
    const lookup = await db.ticket.findFirst({ where: { paymentRef } });
    if (!lookup) {
      return NextResponse.json({ success: false, error: "TICKET_NOT_FOUND" }, { status: 404 });
    }
    const gate = requireFinanceRole(request.headers.get("cookie"), "refund", {
      amountRp: lookup.totalFareRp,
    });
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error }, { status: gate.status });
    }
    const { ticket, idempotent } = await refundTicketPayment({
      id: lookup.id,
      reason,
      actorId: gate.id,
      actorRole: gate.role,
    });
    return NextResponse.json({
      success: true,
      idempotent,
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        paymentStatus: ticket.paymentStatus,
      },
    });
  } catch (err) {
    if (err instanceof FinanceError) {
      const status = err.code === "TICKET_NOT_FOUND" ? 404 : err.code === "GATE_CONSUMED" ? 409 : 400;
      return NextResponse.json({ success: false, error: err.code }, { status });
    }
    return NextResponse.json({ success: false, error: "WEBHOOK_FAILED" }, { status: 500 });
  }
}
