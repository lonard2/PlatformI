/**
 * PlatformI - Search-first intercity ticket hub.
 * Mode, company, origin, destination, and date filters feed the same
 * checkout and wallet as city tickets: 1-trip, 2-class-and-seat,
 * 3-buyer, 4-wallet. Board entry preselects the run; search entry
 * starts from filters. Search stays open without login; checkout
 * collects the Task 3 buyer record with matrix-driven visibility, so
 * rail never shows drop-off and AKAP never shows an address field.
 * Carrier names are wired through getSalesRules at this hub layer so
 * LCC versus full-service inference stays correct, and the fare is
 * recomputed here from mode, carrier, and class.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide icons.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Loader2,
  MapPin,
  QrCode,
  Search,
  Ticket as TicketIcon,
  TrainFront,
  Wallet,
} from "lucide-react";
import { SeatMap, resolveSeatLayout, SeatMapSeatCell } from "./SeatMap";
import { BuyerForm, BuyerRecord } from "./BuyerForm";
import { DigitalPassWallet } from "./DigitalPassWallet";
import { getSalesRules } from "@/lib/transit/salesMatrix";
import { formatRupiah } from "@/lib/services/fareCalculator";
import { useTranslation } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { TimetableRun, Ticket, TicketStatus, TransitMode } from "@/types/transit";

export type IntercityHubRun = TimetableRun & { mode?: TransitMode };

export interface IntercityTicketHubProps {
  initialMode?: TransitMode;
  preselectedRun?: IntercityHubRun | null;
  /** Status poll cadence while a reservation awaits OCC confirmation. */
  statusPollIntervalMs?: number;
}

export const INTERCITY_MODES: TransitMode[] = [
  "KAI_INTERCITY",
  "WHOOSH_HSR",
  "KAI_BANDARA",
  "AKAP_INTERCITY_BUS",
  "EXECUTIVE_SHUTTLE",
  "AIRPORT_COMMERCIAL",
  "MARITIME_PELNI",
  "MARITIME_SPEEDBOAT",
];

const INTERCITY_BASE_FARES: Record<string, number> = {
  KAI_INTERCITY: 150000,
  WHOOSH_HSR: 300000,
  KAI_BANDARA: 75000,
  AKAP_INTERCITY_BUS: 180000,
  EXECUTIVE_SHUTTLE: 150000,
  AIRPORT_COMMERCIAL: 950000,
  MARITIME_PELNI: 280000,
  MARITIME_SPEEDBOAT: 175000,
};

/**
 * Human-readable mode names for the hub filter. Enum codes stay as option
 * values; only the visible labels localize.
 */
export function getIntercityModeLabel(
  mode: TransitMode,
  t: TranslationDictionary
): string {
  switch (mode) {
    case "KAI_INTERCITY":
      return t.ticketing.hubModeKai;
    case "WHOOSH_HSR":
      return t.ticketing.hubModeWhoosh;
    case "KAI_BANDARA":
      return t.ticketing.hubModeAirportRail;
    case "AKAP_INTERCITY_BUS":
      return t.ticketing.hubModeAkap;
    case "EXECUTIVE_SHUTTLE":
      return t.ticketing.hubModeShuttle;
    case "AIRPORT_COMMERCIAL":
      return t.ticketing.hubModeFlight;
    case "MARITIME_PELNI":
      return t.ticketing.hubModePelni;
    case "MARITIME_SPEEDBOAT":
      return t.ticketing.hubModeSpeedboat;
    default:
      return t.ticketing.hubModeKai;
  }
}

/**
 * Infers the intercity mode for a run. Search results carry the mode from
 * the active filter; board-preselected runs fall back to line and operator
 * tokens, then to the hub filter default.
 */
export function inferIntercityMode(
  run: IntercityHubRun,
  fallback?: TransitMode
): TransitMode {
  if (run.mode && INTERCITY_MODES.includes(run.mode)) return run.mode;
  const haystack = `${run.lineId ?? ""} ${run.operatorName ?? ""}`.toLowerCase();
  if (haystack.includes("whoosh") || haystack.includes("kcic")) return "WHOOSH_HSR";
  if (
    haystack.includes("lion") ||
    haystack.includes("citilink") ||
    haystack.includes("garuda") ||
    haystack.includes("airasia") ||
    haystack.includes("super air jet") ||
    haystack.includes("airport") ||
    haystack.includes("cgk") ||
    haystack.includes("hlp")
  ) {
    return "AIRPORT_COMMERCIAL";
  }
  if (haystack.includes("railink") || haystack.includes("bandara")) return "KAI_BANDARA";
  if (
    haystack.includes("kai") ||
    haystack.includes("kereta") ||
    haystack.includes("argo") ||
    haystack.includes("gambir") ||
    haystack.includes("pasar senen")
  ) {
    return "KAI_INTERCITY";
  }
  if (
    haystack.includes("daytrans") ||
    haystack.includes("baraya") ||
    haystack.includes("cititrans") ||
    haystack.includes("bhinneka") ||
    haystack.includes("shuttle")
  ) {
    return "EXECUTIVE_SHUTTLE";
  }
  if (
    haystack.includes("sinar jaya") ||
    haystack.includes("rosalia") ||
    haystack.includes("akap")
  ) {
    return "AKAP_INTERCITY_BUS";
  }
  if (haystack.includes("pelni")) return "MARITIME_PELNI";
  if (haystack.includes("speedboat") || haystack.includes("boat")) {
    return "MARITIME_SPEEDBOAT";
  }
  return fallback ?? "KAI_INTERCITY";
}

/**
 * Builds the carrier key passed as the sales-matrix service class. Flight
 * LCC detection keys off carrier tokens inside this string, so the operator
 * name must travel with the class instead of the class alone.
 */
export function resolveCarrierKey(run: IntercityHubRun): string {
  return [run.operatorName, run.serviceClass].filter(Boolean).join(" ").trim();
}

/**
 * Masks contact details for the pre-payment summary so full phone numbers
 * and email addresses are not printed on screen.
 */
export function maskContactPhone(phone: string): string {
  const digits = phone.trim();
  if (digits.length <= 4) return "••";
  return `${digits.slice(0, 4)}••••${digits.slice(-2)}`;
}

export function maskContactEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!domain || local.length === 0) return "•••";
  return `${local[0]}•••@${domain}`;
}

/** Maps an intercity mode to a SeatMap vehicle class for layout switching. */
export function resolveIntercityVehicleType(mode: TransitMode): string {
  switch (mode) {
    case "AIRPORT_COMMERCIAL":
      return "FLIGHT_3_3";
    case "MARITIME_PELNI":
    case "MARITIME_SPEEDBOAT":
      return "SHIP_DECK";
    case "WHOOSH_HSR":
      return "WHOOSH_RAIL_COACH";
    case "KAI_INTERCITY":
    case "KAI_BANDARA":
      return "KAI_COACH";
    case "EXECUTIVE_SHUTTLE":
      return "SHUTTLE_VIP_2_2";
    case "AKAP_INTERCITY_BUS":
    default:
      return "AKAP_2_2";
  }
}

function classMultiplier(serviceClass: string | undefined): number {
  const key = (serviceClass ?? "").toLowerCase();
  if (key.includes("luxury") || key.includes("suite") || key.includes("first")) return 1.8;
  if (key.includes("sleeper")) return 1.6;
  if (
    key.includes("business") ||
    key.includes("executive") ||
    key.includes("premium")
  ) {
    return 1.4;
  }
  return 1.0;
}

/**
 * Recomputes the intercity fare at the hub layer from mode base, carrier
 * class multiplier, rounded to the nearest thousand rupiah. The parts form
 * is the single source of truth for the fare math shown before payment.
 */
export function resolveIntercityFareParts(
  mode: TransitMode,
  serviceClass: string | undefined,
  runFareRp?: number | null
): { base: number; multiplier: number; total: number } {
  const base = INTERCITY_BASE_FARES[mode] ?? 150000;
  const multiplier = classMultiplier(serviceClass);
  if (typeof runFareRp === "number" && Number.isFinite(runFareRp) && runFareRp > 0) {
    return { base, multiplier, total: Math.round(runFareRp) };
  }
  return { base, multiplier, total: Math.round((base * multiplier) / 1000) * 1000 };
}

export function resolveIntercityFare(
  mode: TransitMode,
  serviceClass: string | undefined,
  runFareRp?: number | null
): number {
  return resolveIntercityFareParts(mode, serviceClass, runFareRp).total;
}

/**
 * Derives deterministic occupied seats from the run id so the seat map is
 * stable across renders. The first row always stays free for boarding.
 */
export function resolveOccupiedSeats(runId: string, vehicleType: string): string[] {
  const ids: string[] = [];
  for (const row of resolveSeatLayout(vehicleType)) {
    for (const cell of row.cells) {
      if (cell.kind === "seat") ids.push((cell as SeatMapSeatCell).id);
    }
  }
  let hash = 0;
  for (const ch of runId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return ids
    .filter((_, index) => index >= 4 && (hash + index * 7) % 9 === 0)
    .slice(0, 8);
}

type HubStep = 1 | 2 | 3 | 4;

interface PendingReservation {
  ticketNumber: string;
  reservationCode: string;
  paymentRef: string | null;
  paymentInstructions: string | null;
}

export const IntercityTicketHub: React.FC<IntercityTicketHubProps> = ({
  initialMode,
  preselectedRun = null,
  statusPollIntervalMs = 5000,
}) => {
  const { t } = useTranslation();

  const [mode, setMode] = useState<string>(initialMode ?? "");
  const [company, setCompany] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const [runs, setRuns] = useState<IntercityHubRun[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const [step, setStep] = useState<HubStep>(preselectedRun ? 2 : 1);
  const [selectedRun, setSelectedRun] = useState<IntercityHubRun | null>(
    preselectedRun
  );
  const [seatId, setSeatId] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<BuyerRecord | null>(null);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [pendingReservation, setPendingReservation] = useState<PendingReservation | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [purchased, setPurchased] = useState<boolean>(false);
  const [purchasedTicket, setPurchasedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (preselectedRun) {
      setSelectedRun(preselectedRun);
      setStep(2);
    }
  }, [preselectedRun]);

  const selectedMode: TransitMode = useMemo(
    () => inferIntercityMode(selectedRun ?? ({} as IntercityHubRun), (mode as TransitMode) || "KAI_INTERCITY"),
    [selectedRun, mode]
  );
  const carrierKey = useMemo(
    () => (selectedRun ? resolveCarrierKey(selectedRun) : ""),
    [selectedRun]
  );
  const salesRules = useMemo(
    () => getSalesRules(selectedMode, carrierKey || undefined),
    [selectedMode, carrierKey]
  );
  const vehicleType = useMemo(
    () => resolveIntercityVehicleType(selectedMode),
    [selectedMode]
  );
  const occupiedSeats = useMemo(
    () => (selectedRun ? resolveOccupiedSeats(selectedRun.id, vehicleType) : []),
    [selectedRun, vehicleType]
  );
  const fareRp = useMemo(
    () => resolveIntercityFare(selectedMode, selectedRun?.serviceClass, selectedRun?.fareRp),
    [selectedMode, selectedRun]
  );
  const fareParts = useMemo(
    () => resolveIntercityFareParts(selectedMode, selectedRun?.serviceClass, selectedRun?.fareRp),
    [selectedMode, selectedRun]
  );

  const handleSearch = useCallback(async (): Promise<void> => {
    setIsSearching(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (mode) params.set("mode", mode);
      if (company.trim()) params.set("company", company.trim());
      if (origin.trim()) params.set("origin", origin.trim());
      if (destination.trim()) params.set("destination", destination.trim());
      if (date) params.set("date", date);
      const query = params.toString();
      const res = await fetch(
        `/api/intercity/routes${query ? `?${query}` : ""}`
      );
      if (!res.ok) throw new Error(t.ticketing.hubErrorLoad);
      const data = await res.json();
      const list: IntercityHubRun[] = Array.isArray(data.runs) ? data.runs : [];
      setRuns(
        list.map((run) => ({
          ...run,
          mode: inferIntercityMode(run, (mode as TransitMode) || undefined),
        }))
      );
      setHasSearched(true);
    } catch {
      setLoadError(t.ticketing.hubErrorLoad);
    } finally {
      setIsSearching(false);
    }
  }, [mode, company, origin, destination, date, t]);

  const handleSelectRun = useCallback(
    (run: IntercityHubRun): void => {
      const withMode: IntercityHubRun = {
        ...run,
        mode: inferIntercityMode(run, (mode as TransitMode) || undefined),
      };
      setSelectedRun(withMode);
      setSeatId(null);
      setBuyer(null);
      setPurchased(false);
      setPurchasedTicket(null);
      setPendingReservation(null);
      setPayError(null);
      setStep(2);
    },
    [mode]
  );

  const buildWalletTicket = useCallback(
    (ticketNumber: string, reservationCode: string, status: TicketStatus): Ticket | null => {
      if (!selectedRun || !buyer) return null;
      const originStopId = `INTERCITY:${selectedRun.id}:ORIGIN`;
      const destinationStopId = `INTERCITY:${selectedRun.id}:DESTINATION`;
      return {
        id: `hub-${ticketNumber}`,
        ticketNumber,
        userId: "guest",
        originStopId,
        destinationStopId,
        legs: [
          {
            legIndex: 0,
            lineId: selectedRun.lineId,
            originStopId,
            destinationStopId,
            mode: selectedMode,
            fareRp,
            distanceKm: 0,
          },
        ],
        totalFareRp: fareRp,
        isJakLingkoCapped: false,
        status,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        rollingToken: `PLATFORMI:${ticketNumber}:guest:0:hub`,
        guestEmail: buyer.email,
        guestPhone: buyer.phone,
        idNumber: buyer.idNumber,
        seatId: seatId ?? undefined,
        serviceClass: selectedRun.serviceClass ?? undefined,
        reservationCode,
        claimedByUserId: null,
      };
    },
    [selectedRun, buyer, selectedMode, fareRp, seatId]
  );

  // Reserve-then-pay: the hub only ever creates an unpaid (WAITING)
  // reservation and shows the transfer instructions. The pass issues when
  // the OCC confirm flips the reservation to ACTIVE (see the poll below).
  const handleReserve = useCallback(async (): Promise<void> => {
    if (!selectedRun || !buyer) return;
    setIsPaying(true);
    setPayError(null);
    try {
      const originStopId = `INTERCITY:${selectedRun.id}:ORIGIN`;
      const destinationStopId = `INTERCITY:${selectedRun.id}:DESTINATION`;
      const res = await fetch("/api/ticketing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "guest",
          runId: selectedRun.id,
          tripCode: selectedRun.tripCode,
          travelDate: date || undefined,
          originStopId,
          destinationStopId,
          legs: [
            {
              legIndex: 0,
              lineId: selectedRun.lineId,
              originStopId,
              destinationStopId,
              mode: selectedMode,
              fareRp: fareRp,
            },
          ],
          totalFareRp: fareRp,
          isJakLingkoCapped: false,
          buyer: {
            fullName: buyer.fullName,
            phone: buyer.phone,
            email: buyer.email,
            idNumber: buyer.idNumber,
          },
          seatId: seatId ?? undefined,
          serviceClass: selectedRun.serviceClass ?? undefined,
          meal: buyer.meal ?? undefined,
          dropOffPointId: buyer.dropOffPointId ?? undefined,
          paymentResult: "pending",
        }),
      });
      if (!res.ok) throw new Error(t.ticketing.errorPaymentFailed);
      const data = (await res.json()) as {
        ticketNumber?: string;
        reservationCode?: string;
        status?: TicketStatus;
        paymentRef?: string | null;
        paymentInstructions?: string | null;
      };
      if (!data.ticketNumber || !data.reservationCode) {
        throw new Error(t.ticketing.errorPaymentFailed);
      }
      if (data.status === "ACTIVE") {
        // Zero-fare or already-settled reservations issue immediately.
        const ticket = buildWalletTicket(data.ticketNumber, data.reservationCode, "ACTIVE");
        if (!ticket) throw new Error(t.ticketing.errorPaymentFailed);
        setPurchasedTicket(ticket);
        setPurchased(true);
        return;
      }
      setPendingReservation({
        ticketNumber: data.ticketNumber,
        reservationCode: data.reservationCode,
        paymentRef: data.paymentRef ?? null,
        paymentInstructions: data.paymentInstructions ?? null,
      });
    } catch (err) {
      setPayError(err instanceof Error ? err.message : t.ticketing.errorPaymentFailed);
    } finally {
      setIsPaying(false);
    }
  }, [selectedRun, buyer, selectedMode, fareRp, date, seatId, buildWalletTicket, t]);

  // Poll the guest lookup until the OCC confirm flips the pending
  // reservation to ACTIVE, then issue the pass. Stops on unmount or when
  // another reservation supersedes the pending one.
  useEffect(() => {
    if (!pendingReservation || !buyer) return;
    let cancelled = false;
    const checkStatus = async (): Promise<void> => {
      setIsCheckingPayment(true);
      try {
        const res = await fetch(
          `/api/ticketing/guest-lookup?code=${encodeURIComponent(pendingReservation.reservationCode)}&phone=${encodeURIComponent(buyer.phone)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { ticket?: { status?: TicketStatus } };
        if (cancelled || json.ticket?.status !== "ACTIVE") return;
        const ticket = buildWalletTicket(
          pendingReservation.ticketNumber,
          pendingReservation.reservationCode,
          "ACTIVE"
        );
        if (cancelled || !ticket) return;
        // Inject the fresh pass into the wallet so checkout never loses it.
        setPurchasedTicket(ticket);
        setPendingReservation(null);
        setPurchased(true);
      } catch {
        // Transient lookup failure: the next tick retries.
      } finally {
        if (!cancelled) setIsCheckingPayment(false);
      }
    };
    void checkStatus();
    const timer = setInterval(() => {
      void checkStatus();
    }, statusPollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingReservation, buyer, buildWalletTicket, statusPollIntervalMs]);

  const stepLabels = [
    t.ticketing.hubStepTrip,
    t.ticketing.hubStepSeat,
    t.ticketing.hubStepBuyer,
    t.ticketing.hubStepWallet,
  ];

  return (
    <section
      aria-label={t.ticketing.hubTitle}
      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          <TicketIcon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{t.ticketing.hubTitle}</h2>
          <p className="text-[11px] text-slate-400">{t.ticketing.hubSubtitle}</p>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label={t.ticketing.hubTitle}>
        {stepLabels.map((label, index) => {
          const stepNumber = (index + 1) as HubStep;
          const isActive = step === stepNumber;
          return (
            <li
              key={label}
              aria-current={isActive ? "step" : undefined}
              className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition ${
                isActive
                  ? "border-cyan-400/60 bg-cyan-950/60 text-cyan-200"
                  : "border-slate-800 bg-slate-900/60 text-slate-400"
              }`}
            >
              {label}
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] text-slate-500">{t.ticketing.hubNoLogin}</p>

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="hub-mode"
                className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
              >
                <TrainFront aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
                {t.ticketing.hubMode}
              </label>
              <select
                id="hub-mode"
                aria-label={t.ticketing.hubMode}
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400"
              >
                <option value="">{t.common.all}</option>
                {INTERCITY_MODES.map((option) => (
                  <option key={option} value={option}>
                    {getIntercityModeLabel(option, t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="hub-company"
                className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
              >
                <Building2 aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
                {t.ticketing.hubCompany}
              </label>
              <input
                id="hub-company"
                type="text"
                aria-label={t.ticketing.hubCompany}
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400"
              />
            </div>
            <div>
              <label
                htmlFor="hub-origin"
                className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
              >
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
                {t.ticketing.hubOrigin}
              </label>
              <input
                id="hub-origin"
                type="text"
                aria-label={t.ticketing.hubOrigin}
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400"
              />
            </div>
            <div>
              <label
                htmlFor="hub-destination"
                className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
              >
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
                {t.ticketing.hubDestination}
              </label>
              <input
                id="hub-destination"
                type="text"
                aria-label={t.ticketing.hubDestination}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="hub-date"
                className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
              >
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
                {t.ticketing.hubDate}
              </label>
              <input
                id="hub-date"
                type="date"
                aria-label={t.ticketing.hubDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50 sm:w-auto"
          >
            {isSearching ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Search aria-hidden="true" className="h-4 w-4" />
            )}
            <span>{isSearching ? t.ticketing.hubSearching : t.ticketing.hubSearch}</span>
          </button>

          {loadError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </p>
          )}

          {hasSearched && !loadError && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-200">
                {t.ticketing.hubResults} ·{" "}
                {t.ticketing.hubRunsFound.replace("{n}", String(runs.length))}
              </h3>
              {runs.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-4 text-center text-xs text-slate-400">
                  {t.ticketing.hubEmpty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {runs.map((run) => {
                    const runFare = resolveIntercityFare(
                      run.mode ?? ((mode as TransitMode) || "KAI_INTERCITY"),
                      run.serviceClass,
                      run.fareRp
                    );
                    return (
                      <li
                        key={run.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-xs">
                          <p className="font-mono font-bold text-white">{run.tripCode}</p>
                          <p className="text-slate-300">
                            {run.origin} → {run.destination}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {run.departureTime}–{run.arrivalTime} · {run.operatorName} · {formatRupiah(runFare)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectRun(run)}
                          aria-label={t.ticketing.hubSelectTrip.replace("{code}", run.tripCode)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/60 px-3 py-2 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                        >
                          <span>{t.ticketing.hubContinue}</span>
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedRun && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t.ticketing.hubSelectedTrip}
            </p>
            <p className="font-mono font-bold text-white">{selectedRun.tripCode}</p>
            <p className="text-slate-300">
              {selectedRun.origin} → {selectedRun.destination}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              {selectedRun.departureTime}–{selectedRun.arrivalTime} · {selectedRun.operatorName}
            </p>
            {selectedRun.serviceClass && (
              <p className="mt-1 text-[11px] text-slate-400">
                {t.ticketing.hubClass}: {selectedRun.serviceClass}
              </p>
            )}
          </div>

          <SeatMap
            vehicleType={vehicleType}
            occupiedSeatIds={occupiedSeats}
            selectedSeatId={seatId}
            onSelect={setSeatId}
          />

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.ticketing.hubPrice}</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {formatRupiah(fareRp)}
              </span>
            </div>
            {salesRules.meal === "paid" && (
              <p className="mt-1 text-[11px] text-slate-500">{t.ticketing.hubMealPaidNote}</p>
            )}
            {salesRules.baggage === "paid" && (
              <p className="mt-1 text-[11px] text-slate-500">{t.ticketing.hubBagPaidNote}</p>
            )}
          </div>

          <div className="flex gap-2">
            {!preselectedRun && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{t.ticketing.hubBack}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={salesRules.seatMap && seatId === null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
            >
              <span>{t.ticketing.hubContinue}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && selectedRun && (
        <div className="space-y-3">
          <BuyerForm
            mode={selectedMode}
            serviceClass={carrierKey}
            onValid={(record: BuyerRecord) => {
              setBuyer(record);
              setStep(4);
            }}
          />
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t.ticketing.hubBack}</span>
          </button>
        </div>
      )}

      {step === 4 && selectedRun && buyer && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs">
            <p className="font-mono font-bold text-white">{selectedRun.tripCode}</p>
            <p className="text-slate-300">
              {selectedRun.origin} → {selectedRun.destination}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              {t.ticketing.hubClass}: {selectedRun.serviceClass ?? carrierKey}
              {seatId ? ` · ${t.vehicleInspector.seat} ${seatId}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {t.ticketing.hubBuyerLine.replace("{name}", buyer.fullName)}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              {t.ticketing.hubBuyerContact}: {maskContactPhone(buyer.phone)} ·{" "}
              {maskContactEmail(buyer.email)}
            </p>
            <div className="mt-1 flex items-center justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">{t.ticketing.hubBaseFare}</span>
              <span className="font-mono text-xs font-semibold text-slate-200">
                {formatRupiah(fareParts.base)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-slate-400">
                {t.ticketing.hubClassMult.replace("{n}", String(fareParts.multiplier))}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-200">
                {selectedRun.serviceClass ?? carrierKey}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">{t.ticketing.hubPrice}</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {formatRupiah(fareRp)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                <span>{t.ticketing.hubEditSeat}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                <span>{t.ticketing.hubEditBuyer}</span>
              </button>
            </div>
          </div>

          {payError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{payError}</span>
            </p>
          )}

          {purchased ? (
            <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2.5 text-center">
              <CheckCircle2 aria-hidden="true" className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="text-xs font-bold text-emerald-300">{t.ticketing.hubPurchased}</p>
              <p className="text-xs text-slate-300">{buyer.fullName}</p>
              <p className="font-mono text-[11px] text-slate-400">
                {t.ticketing.hubPaidFor.replace("{name}", buyer.fullName)} · {formatRupiah(fareRp)}
              </p>
              {purchasedTicket && (
                <p className="font-mono text-[11px] text-cyan-300">
                  {t.ticketing.hubReservationCode}: {purchasedTicket.reservationCode}
                </p>
              )}
            </div>
          ) : pendingReservation ? (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2.5">
              <p className="text-xs font-bold text-amber-200">{t.ticketing.hubAwaitingPayment}</p>
              <p className="font-mono text-[11px] text-slate-300">
                {t.ticketing.hubReservationCode}: {pendingReservation.reservationCode}
              </p>
              {pendingReservation.paymentRef && (
                <p className="font-mono text-[11px] text-slate-300">
                  {t.ticketing.hubPaymentRef}: {pendingReservation.paymentRef}
                </p>
              )}
              {pendingReservation.paymentInstructions && (
                <p className="text-xs text-slate-300">{pendingReservation.paymentInstructions}</p>
              )}
              {isCheckingPayment && (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.ticketing.hubCheckingPayment}</span>
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleReserve()}
              disabled={isPaying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
            >
              {isPaying ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet aria-hidden="true" className="h-4 w-4" />
              )}
              <span>
                {t.ticketing.hubReserveNow} · {formatRupiah(fareRp)}
              </span>
            </button>
          )}

          <DigitalPassWallet injectedTicket={purchasedTicket} />
        </div>
      )}
    </section>
  );
};
