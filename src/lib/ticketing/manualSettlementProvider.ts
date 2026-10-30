/**
 * PlatformI - Manual settlement provider ("manual").
 *
 * The first real money path: the commuter pays off-app (bank transfer or
 * QRIS to the operator account shown in the instructions, quoting the
 * reservation code), and an OCC finance officer confirms receipt against
 * the transfer proof. Double confirmation is idempotent-safe (the second
 * confirm changes nothing); refunds require a finance actor and refuse
 * gate-consumed tickets (the route layer re-checks against live DB state).
 *
 * PSP adapters (Midtrans/Xendit/Stripe) implement PaymentProvider the same
 * way; nothing else in the codebase may assume how money moved.
 */

import {
  isFinanceActor,
  type ChargeRequest,
  type ChargeResult,
  type ConfirmPaymentInput,
  type PaymentProvider,
  type RefundPaymentInput,
  type TicketUpdate,
} from "@/lib/ticketing/paymentProvider";

export const MANUAL_PROVIDER_ID = "manual";

const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

function randomSuffix(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatRupiah(amountRp: number): string {
  return `Rp${amountRp.toLocaleString("id-ID")}`;
}

export function createManualSettlementProvider(): PaymentProvider {
  return {
    id: MANUAL_PROVIDER_ID,

    createCharge(input: ChargeRequest): ChargeResult {
      if (!Number.isFinite(input.amountRp) || input.amountRp <= 0) {
        throw new Error("INVALID_AMOUNT");
      }
      if (input.reservationCode.trim() === "") {
        throw new Error("MISSING_RESERVATION_CODE");
      }
      const paymentRef = `MAN-${input.reservationCode.trim()}-${randomSuffix()}`;
      return {
        paymentRef,
        instructions:
          `Transfer ${formatRupiah(input.amountRp)} to the operator account and ` +
          `quote code ${input.reservationCode.trim()} in the transfer note. ` +
          `An OCC finance officer confirms receipt before boarding.`,
        amountRp: input.amountRp,
        expiresAt: new Date(Date.now() + CONFIRM_WINDOW_MS),
      };
    },

    confirmPayment(input: ConfirmPaymentInput): TicketUpdate {
      if (!isFinanceActor(input.actor)) {
        throw new Error("FORBIDDEN_NOT_FINANCE");
      }
      if (!input.paymentRef || input.paymentRef.trim() === "") {
        throw new Error("MISSING_PAYMENT_REF");
      }
      if (input.current?.paymentStatus === "PAID") {
        return { paymentStatus: "PAID" };
      }
      if (input.current?.paymentStatus === "REFUNDED") {
        throw new Error("ALREADY_REFUNDED");
      }
      return {
        paymentStatus: "PAID",
        paidAt: new Date(),
        paymentRef: input.paymentRef,
        paymentMethod: MANUAL_PROVIDER_ID,
      };
    },

    refundPayment(input: RefundPaymentInput): TicketUpdate {
      if (!isFinanceActor(input.actor)) {
        throw new Error("FORBIDDEN_NOT_FINANCE");
      }
      if (!input.reason || input.reason.trim() === "") {
        throw new Error("MISSING_REFUND_REASON");
      }
      if (input.current.paymentStatus === "REFUNDED") {
        throw new Error("ALREADY_REFUNDED");
      }
      if (input.current.gateConsumed) {
        throw new Error("GATE_CONSUMED_NOT_REFUNDABLE");
      }
      return {
        paymentStatus: "REFUNDED",
        refundedAt: new Date(),
        refundReason: input.reason.trim(),
      };
    },
  };
}
