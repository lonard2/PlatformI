/**
 * PlatformI - Digital Transit Pass Wallet & Gate Scanner Simulator
 *
 * Implements:
 * - Active digital passes management with 30s dynamic rolling QR display
 * - Turnstile gate scanner simulator (Tap-In & Tap-Out state machine)
 * - Journey history log with JakLingko savings badges
 * - Purchase modal trigger
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Ticket as TicketIcon,
  QrCode,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Train,
  Bus,
  Plus,
  Radio,
  Sparkles,
  History,
  Check,
  Loader2,
  TicketCheck,
} from "lucide-react";
import { DynamicQRCode } from "./DynamicQRCode";
import { GuestTicketLookup, GuestFoundTicket } from "./GuestTicketLookup";
import { TicketPurchaseModal } from "./TicketPurchaseModal";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { formatRupiah } from "@/lib/services/fareCalculator";
import { Ticket, TicketStatus } from "@/types/transit";
import { useTranslation } from "@/lib/i18n";

interface DigitalPassWalletProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  /** Freshly purchased pass injected by the intercity hub checkout. */
  injectedTicket?: Ticket | null;
}

export const DigitalPassWallet: React.FC<DigitalPassWalletProps> = ({
  isOpen = true,
  onClose,
  className = "",
  injectedTicket = null,
}) => {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);

  // Active tickets state
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "tkt-mrt-01",
      ticketNumber: "TKT-MRT-88219",
      userId: "USR-JAKARTA-01",
      originStopId: "stop-mrt-01", // Lebak Bulus
      destinationStopId: "stop-mrt-12", // Dukuh Atas
      legs: [
        {
          legIndex: 0,
          lineId: "line-mrt-ns",
          originStopId: "stop-mrt-01",
          destinationStopId: "stop-mrt-12",
          mode: "MRT_JAKARTA",
          fareRp: 13000,
          distanceKm: 14.5,
        },
      ],
      totalFareRp: 13000,
      isJakLingkoCapped: false,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      rollingToken: "PLATFORMI:TKT-MRT-88219:USR-JAKARTA-01:0:init",
      reservationCode: "RSV-MRT-88219",
    },
    {
      id: "tkt-tj-02",
      ticketNumber: "TKT-TJ-44102",
      userId: "USR-JAKARTA-01",
      originStopId: "stop-tj-1-01", // Blok M
      destinationStopId: "stop-tj-1-15", // Kota
      legs: [
        {
          legIndex: 0,
          lineId: "line-tj-cor-1",
          originStopId: "stop-tj-1-01",
          destinationStopId: "stop-tj-1-15",
          mode: "TRANSJAKARTA_BRT",
          fareRp: 3500,
          distanceKm: 15.6,
        },
      ],
      totalFareRp: 3500,
      isJakLingkoCapped: false,
      status: "ACTIVE",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
      rollingToken: "PLATFORMI:TKT-TJ-44102:USR-JAKARTA-01:0:init",
      reservationCode: "RSV-TJ-44102",
    },
    {
      id: "tkt-wait-03",
      ticketNumber: "TKT-AKAP-77310",
      userId: "guest",
      originStopId: "INTERCITY:RUN-AKAP-01:ORIGIN",
      destinationStopId: "INTERCITY:RUN-AKAP-01:DESTINATION",
      legs: [
        {
          legIndex: 0,
          lineId: "line-akap-test",
          originStopId: "INTERCITY:RUN-AKAP-01:ORIGIN",
          destinationStopId: "INTERCITY:RUN-AKAP-01:DESTINATION",
          mode: "AKAP_INTERCITY_BUS",
          fareRp: 180000,
          distanceKm: 320,
        },
      ],
      totalFareRp: 180000,
      isJakLingkoCapped: false,
      status: "WAITING",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      rollingToken: "PLATFORMI:TKT-AKAP-77310:guest:0:init",
      reservationCode: "RSV-WAIT-77310",
      guestPhone: "+6281234567890",
      guestEmail: "guest@example.com",
      seatId: "12A",
      serviceClass: "EXECUTIVE",
      claimedByUserId: null,
    },
    {
      id: "tkt-fail-04",
      ticketNumber: "TKT-AKAP-77410",
      userId: "guest",
      originStopId: "INTERCITY:RUN-AKAP-02:ORIGIN",
      destinationStopId: "INTERCITY:RUN-AKAP-02:DESTINATION",
      legs: [
        {
          legIndex: 0,
          lineId: "line-akap-test",
          originStopId: "INTERCITY:RUN-AKAP-02:ORIGIN",
          destinationStopId: "INTERCITY:RUN-AKAP-02:DESTINATION",
          mode: "AKAP_INTERCITY_BUS",
          fareRp: 180000,
          distanceKm: 320,
        },
      ],
      totalFareRp: 180000,
      isJakLingkoCapped: false,
      status: "FAILED",
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 21 * 3600 * 1000).toISOString(),
      rollingToken: "PLATFORMI:TKT-AKAP-77410:guest:0:init",
      reservationCode: "RSV-FAIL-77410",
      guestPhone: "+6281234567890",
      claimedByUserId: null,
    },
    {
      id: "tkt-ref-05",
      ticketNumber: "TKT-AKAP-77510",
      userId: "guest",
      originStopId: "INTERCITY:RUN-AKAP-03:ORIGIN",
      destinationStopId: "INTERCITY:RUN-AKAP-03:DESTINATION",
      legs: [
        {
          legIndex: 0,
          lineId: "line-akap-test",
          originStopId: "INTERCITY:RUN-AKAP-03:ORIGIN",
          destinationStopId: "INTERCITY:RUN-AKAP-03:DESTINATION",
          mode: "AKAP_INTERCITY_BUS",
          fareRp: 180000,
          distanceKm: 320,
        },
      ],
      totalFareRp: 180000,
      isJakLingkoCapped: false,
      status: "REFUNDED",
      createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      rollingToken: "PLATFORMI:TKT-AKAP-77510:guest:0:init",
      reservationCode: "RSV-REF-77510",
      guestPhone: "+6281234567890",
      claimedByUserId: null,
    },
  ]);

  const [activeTicketId, setActiveTicketId] = useState<string>("tkt-mrt-01");
  const [activeTab, setActiveTab] = useState<"ACTIVE_PASSES" | "TRIP_HISTORY" | "GUEST_LOOKUP">("ACTIVE_PASSES");
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  // Ticket numbers imported via guest lookup: the guest-safe projection
  // carries no fare data, so their amounts render as absent, never Rp 0.
  const [guestUnknownFareIds, setGuestUnknownFareIds] = useState<ReadonlySet<string>>(new Set());

  // Turnstile Gate Simulator State
  const [isValidatingGate, setIsValidatingGate] = useState<boolean>(false);
  const [lastScanType, setLastScanType] = useState<"TAP_IN" | "TAP_OUT" | null>(null);
  const [gateFeedback, setGateFeedback] = useState<{
    success: boolean;
    message: string;
    action: "OPEN" | "DENY";
  } | null>(null);

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
  const originStop = allStops.find((s) => s.id === activeTicket?.originStopId);
  const destinationStop = allStops.find((s) => s.id === activeTicket?.destinationStopId);

  // Gate scanner tap simulator
  const handleGateScan = async (scanType: "TAP_IN" | "TAP_OUT") => {
    if (!activeTicket) return;

    setIsValidatingGate(true);
    setGateFeedback(null);
    setLastScanType(scanType);

    try {
      const nowMs = Date.now();
      const timeStep = Math.floor(nowMs / 30000);
      const res = await fetch("/api/ticketing/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrPayload: `PLATFORMI:${activeTicket.ticketNumber}:${activeTicket.userId}:${timeStep}:simulated`,
          stationId: scanType === "TAP_IN" ? originStop?.id || "GATE-01" : destinationStop?.id || "GATE-02",
          scanType,
        }),
      });

      const data = await res.json();

      if (res.ok && data.isValid) {
        const nextStatus: TicketStatus = scanType === "TAP_IN" ? "IN_JOURNEY" : "COMPLETED";
        setTickets((prev) =>
          prev.map((t) => (t.id === activeTicket.id ? { ...t, status: nextStatus } : t))
        );

        setGateFeedback({
          success: true,
          action: "OPEN",
          message:
            scanType === "TAP_IN"
              ? t.ticketing.gateTapIn
              : t.ticketing.gateTapOut,
        });
      } else {
        setGateFeedback({
          success: false,
          action: "DENY",
          message: data.message || t.ticketing.gateDenied,
        });
      }
    } catch {
      // Offline or network failure: deny honestly, preserve the ticket
      // state and QR. Never report OPEN without a server answer.
      setGateFeedback({
        success: false,
        action: "DENY",
        message: t.ticketing.gateOfflineDenied,
      });
    } finally {
      setIsValidatingGate(false);
    }
  };

  const handleTicketPurchased = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setActiveTicketId(newTicket.id);
    setIsPurchaseModalOpen(false);
  };

  // Fresh pass injected by the intercity hub checkout after payment.
  useEffect(() => {
    if (!injectedTicket) return;
    setTickets((prev) =>
      prev.some((t) => t.ticketNumber === injectedTicket.ticketNumber)
        ? prev
        : [injectedTicket, ...prev]
    );
    setActiveTicketId(injectedTicket.id);
  }, [injectedTicket]);

  const handleGuestFound = (found: GuestFoundTicket) => {
    const guestTicket: Ticket = {
      id: `guest-${found.ticketNumber}`,
      ticketNumber: found.ticketNumber,
      userId: "guest",
      originStopId: found.originStopId,
      destinationStopId: found.destinationStopId,
      // Legs and fare are absent from the guest-safe projection, so keep
      // the structural placeholders and mark the ticket fare-unknown for
      // display (history renders no fabricated amount for these tickets).
      legs: [],
      totalFareRp: 0,
      isJakLingkoCapped: false,
      status: found.status,
      createdAt: found.createdAt,
      expiresAt: found.expiresAt,
      rollingToken: "",
      reservationCode: found.reservationCode,
      seatId: found.seatId ?? undefined,
      serviceClass: found.serviceClass ?? undefined,
      claimedByUserId: null,
    };
    setGuestUnknownFareIds((prev) => new Set(prev).add(found.ticketNumber));
    setTickets((prev) =>
      prev.some((t) => t.ticketNumber === guestTicket.ticketNumber)
        ? prev.map((t) => (t.ticketNumber === guestTicket.ticketNumber ? guestTicket : t))
        : [guestTicket, ...prev]
    );
    setActiveTicketId(guestTicket.id);
    setActiveTab("ACTIVE_PASSES");
  };

  const statusBadge = (status: TicketStatus): { label: string; className: string } => {
    switch (status) {
      case "IN_JOURNEY":
        return { label: t.ticketing.statusInJourney, className: "bg-amber-950/70 border-amber-500/40 text-amber-300" };
      case "WAITING":
        return { label: t.ticketing.statusWaiting, className: "bg-sky-950/70 border-sky-500/40 text-sky-300" };
      case "FAILED":
        return { label: t.ticketing.statusFailed, className: "bg-rose-950/70 border-rose-500/40 text-rose-300" };
      case "REFUNDED":
        return { label: t.ticketing.statusRefunded, className: "bg-slate-800/70 border-slate-600/40 text-slate-300" };
      case "COMPLETED":
        return { label: t.ticketing.tripCompleted, className: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300" };
      case "EXPIRED":
        return { label: t.ticketing.tripExpired, className: "bg-slate-800/70 border-slate-600/40 text-slate-400" };
      case "CANCELLED":
        return { label: t.ticketing.statusCancelled, className: "bg-slate-800/70 border-slate-600/40 text-slate-400" };
      default:
        return { label: t.ticketing.statusReadyToTap, className: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300" };
    }
  };

  /** Effective QR status: a lapsed expiry suppresses the QR with the expired reason. */
  const resolveQrStatus = (ticket: Ticket): TicketStatus => {
    if (
      (ticket.status === "ACTIVE" ||
        ticket.status === "IN_JOURNEY" ||
        ticket.status === "WAITING") &&
      new Date(ticket.expiresAt).getTime() <= Date.now()
    ) {
      return "EXPIRED";
    }
    return ticket.status;
  };

  const activePasses = tickets.filter((t) => t.status === "ACTIVE" || t.status === "IN_JOURNEY");
  const waitingPasses = tickets.filter((t) => t.status === "WAITING");
  const failedPasses = tickets.filter((t) => t.status === "FAILED");
  const pastTrips = tickets.filter(
    (t) => t.status === "COMPLETED" || t.status === "EXPIRED" || t.status === "REFUNDED" || t.status === "CANCELLED"
  );

  return (
    <div
      className={`flex flex-col h-full bg-slate-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Wallet Header */}
      <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {t.ticketing.passWallet}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono">
                {activePasses.length} {t.common.active}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {t.ticketing.rollingSecurityCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5 btn-tactile transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.ticketing.purchaseTicket}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              aria-label={t.common.close}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 btn-tactile transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("ACTIVE_PASSES")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "ACTIVE_PASSES"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{t.ticketing.activePasses} ({activePasses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TRIP_HISTORY")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "TRIP_HISTORY"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t.ticketing.tripHistory} ({pastTrips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("GUEST_LOOKUP")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "GUEST_LOOKUP"
              ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TicketCheck className="w-3.5 h-3.5" />
          <span>{t.ticketing.guestLookupTitle}</span>
        </button>
      </div>

      {/* Wallet Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === "ACTIVE_PASSES" ? (
          activePasses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-3">
              <TicketIcon className="w-8 h-8 mx-auto text-slate-600" />
              <p>{t.ticketing.walletEmpty}</p>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                {t.ticketing.purchasePass}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pass Card Carousel / Selector */}
              {activePasses.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {activePasses.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono whitespace-nowrap transition ${
                        t.id === activeTicket?.id
                          ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.ticketNumber}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Pass Card */}
              {activeTicket && (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 space-y-3">
                  {/* Route & Pass Info */}
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {t.ticketing.ticketPrefix}{activeTicket.ticketNumber}
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <span>{originStop?.name || t.ticketing.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{destinationStop?.name || t.ticketing.destination}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${statusBadge(activeTicket.status).className}`}
                    >
                      {statusBadge(activeTicket.status).label}
                    </span>
                  </div>

                  {/* 30s Dynamic Rolling QR Component + gate panel: stacked sheet on mobile, split-view on tablet+ */}
                  <div className="grid gap-3 md:grid-cols-2 md:items-start">
                  <DynamicQRCode
                    ticketId={activeTicket.ticketNumber}
                    userId={activeTicket.userId}
                    size={190}
                    showTimerRing={true}
                    showPayloadHash={true}
                    status={resolveQrStatus(activeTicket)}
                  />

                  {/* Gate Scanner Simulator Panel */}
                  <div className="pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-3 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>{t.ticketing.simulateGate}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {t.ticketing.stationPrefix} {originStop?.code || "CSW"}
                      </span>
                    </div>

                    {gateFeedback && (
                      <div
                        role={gateFeedback.success ? "status" : "alert"}
                        aria-live={gateFeedback.success ? "polite" : "assertive"}
                        className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-mono break-words ${
                          gateFeedback.success
                            ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                        }`}
                      >
                        {gateFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{gateFeedback.message}</span>
                      </div>
                    )}

                    {(() => {
                      const qrStatus = activeTicket ? resolveQrStatus(activeTicket) : null;
                      const canTapIn = qrStatus === "ACTIVE";
                      const canTapOut = qrStatus === "IN_JOURNEY";
                      const hint = !canTapIn
                        ? t.ticketing.gateTapInHint
                        : !canTapOut
                          ? t.ticketing.gateTapOutHint
                          : null;
                      return (
                        <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGateScan("TAP_IN")}
                        disabled={isValidatingGate || !canTapIn}
                        aria-describedby={hint ? "gate-tap-hint" : undefined}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 btn-tactile transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isValidatingGate ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t.ticketing.simulateTapIn}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleGateScan("TAP_OUT")}
                        disabled={isValidatingGate || !canTapOut}
                        aria-describedby={hint ? "gate-tap-hint" : undefined}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 btn-tactile transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isValidatingGate ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t.ticketing.simulateTapOut}</span>
                          </>
                        )}
                      </button>
                    </div>
                    {gateFeedback && !gateFeedback.success && lastScanType && (
                      <button
                        onClick={() => handleGateScan(lastScanType)}
                        disabled={isValidatingGate}
                        className="w-full py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-bold text-rose-200 btn-tactile transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <span>{t.ticketing.gateRetryTap}</span>
                      </button>
                    )}
                    {hint && (
                      <p id="gate-tap-hint" className="text-xs text-slate-400">
                        {hint}
                      </p>
                    )}
                        </>
                      );
                    })()}
                  </div>
                  </div>
                </div>
              )}

              {/* Pending reservations: collapsed so the scannable pass and
                  TAP block own the first viewport. QR withheld until paid. */}
              {(waitingPasses.length > 0 || failedPasses.length > 0) && (
                <details className="rounded-xl border border-slate-800 bg-slate-900/60">
                  <summary className="cursor-pointer px-3.5 py-2.5 text-xs font-bold text-slate-300 min-h-[44px] flex items-center">
                    {t.ticketing.gatePendingIssues.replace(
                      "{n}",
                      String(waitingPasses.length + failedPasses.length)
                    )}
                  </summary>
                  <div className="px-3.5 pb-3.5 space-y-2">
                    {waitingPasses.map((w) => (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-sky-300 text-[10px]">
                            {w.ticketNumber} · {w.reservationCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${statusBadge(w.status).className}`}>
                            {statusBadge(w.status).label}
                          </span>
                        </div>
                        <p className="text-[11px] text-sky-200/80">{t.ticketing.qrReasonWaiting}</p>
                        <button
                          onClick={() => setIsPurchaseModalOpen(true)}
                          className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs btn-tactile transition min-h-[44px]"
                        >
                          {t.ticketing.hubPayNow}
                        </button>
                      </div>
                    ))}
                    {failedPasses.map((f) => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-rose-300 text-[10px]">
                            {f.ticketNumber} · {f.reservationCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${statusBadge(f.status).className}`}>
                            {statusBadge(f.status).label}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-200/80">{t.ticketing.qrReasonFailed}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsPurchaseModalOpen(true)}
                            className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs btn-tactile transition min-h-[44px]"
                          >
                            {t.ticketing.hubPayNow}
                          </button>
                          <button
                            onClick={() => setActiveTab("GUEST_LOOKUP")}
                            className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 font-bold text-xs btn-tactile transition min-h-[44px]"
                          >
                            {t.ticketing.guestLookupFallbackTitle}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )
        ) : activeTab === "TRIP_HISTORY" ? (
          /* Trip History */
          <div className="space-y-2.5">
            {pastTrips.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>{t.ticketing.noTrips}</p>
              </div>
            ) : (
              pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-slate-400 text-[10px]">
                      {trip.ticketNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${statusBadge(trip.status).className}`}>
                      {statusBadge(trip.status).label}
                    </span>
                  </div>
                  <div className="font-bold text-white">
                    {allStops.find((s) => s.id === trip.originStopId)?.name || t.ticketing.origin} &rarr;{" "}
                    {allStops.find((s) => s.id === trip.destinationStopId)?.name || t.ticketing.destination}
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">{t.ticketing.paidPrefix}</span>
                    {guestUnknownFareIds.has(trip.ticketNumber) ? (
                      <span className="font-mono text-slate-500" aria-label={t.ticketing.paidPrefix}>
                        &mdash;
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-400">
                        {formatRupiah(trip.totalFareRp)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Guest lookup: code plus phone with support fallback fields */
          <GuestTicketLookup onFound={handleGuestFound} />
        )}
      </div>

      {/* Ticket Purchase Modal */}
      <TicketPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onTicketPurchased={handleTicketPurchased}
      />
    </div>
  );
};
