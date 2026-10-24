/**
 * PlatformI - Guest ticket lookup by reservation code plus phone.
 * Logged-out buyers retrieve a reservation without signing in; support
 * fallback fields (trip date, ID, operator, journey, route name) assist
 * lookup when the reservation code is unreadable. Returns the guest-safe
 * ticket projection (no payment data) through onFound.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide icons.
 */

"use client";

import React, { useState } from "react";
import {
  TicketCheck,
  Phone,
  CalendarDays,
  IdCard,
  Building2,
  Route,
  MapPinned,
  Loader2,
  CircleAlert,
  Search,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { hasGuestLookupFallback } from "@/lib/ticketing/reservationContract";
import type { TicketStatus } from "@/types/transit";

export interface GuestFoundTicket {
  ticketNumber: string;
  reservationCode: string;
  status: TicketStatus;
  originStopId: string;
  destinationStopId: string;
  seatId: string | null;
  serviceClass: string | null;
  buyerFullName: string | null;
  travelDate: string | null;
  tripCode: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface GuestTicketLookupProps {
  onFound: (ticket: GuestFoundTicket) => void;
  className?: string;
}

export const GuestTicketLookup: React.FC<GuestTicketLookupProps> = ({
  onFound,
  className = "",
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [tripDate, setTripDate] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [journey, setJourney] = useState<string>("");
  const [routeName, setRouteName] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const fallback = {
      tripDate: tripDate.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      operator: operator.trim() || undefined,
      journey: journey.trim() || undefined,
      routeName: routeName.trim() || undefined,
    };
    if (phone.trim() === "" || (code.trim() === "" && !hasGuestLookupFallback(fallback))) {
      setError(t.ticketing.guestLookupError);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        phone: phone.trim(),
      });
      if (code.trim() !== "") params.set("code", code.trim());
      if (fallback.tripDate) params.set("tripDate", fallback.tripDate);
      if (fallback.idNumber) params.set("idNumber", fallback.idNumber);
      if (fallback.operator) params.set("operator", fallback.operator);
      if (fallback.journey) params.set("journey", fallback.journey);
      if (fallback.routeName) params.set("routeName", fallback.routeName);
      const res = await fetch(`/api/ticketing/guest-lookup?${params.toString()}`);
      const data = (await res.json()) as {
        success?: boolean;
        ticket?: GuestFoundTicket;
        error?: string;
      };
      if (!res.ok || !data.success || !data.ticket) {
        setError(
          res.status === 404 ? t.ticketing.guestLookupNotFound : t.ticketing.guestLookupError
        );
        return;
      }
      onFound(data.ticket);
    } catch {
      setError(t.ticketing.guestLookupError);
    } finally {
      setIsSearching(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400";

  return (
    <section
      aria-label={t.ticketing.guestLookupTitle}
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          <TicketCheck aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{t.ticketing.guestLookupTitle}</h2>
          <p className="text-[11px] text-slate-400">{t.ticketing.guestLookupSubtitle}</p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="guest-ticket-code"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <Search aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestTicketCode}
            </label>
            <input
              id="guest-ticket-code"
              type="text"
              aria-label={t.ticketing.guestTicketCode}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              className={`${inputClass} font-mono uppercase`}
              placeholder="RSV-XXXXXX"
            />
          </div>
          <div>
            <label
              htmlFor="guest-phone"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.buyerPhone}
            </label>
            <input
              id="guest-phone"
              type="tel"
              aria-label={t.ticketing.buyerPhone}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              autoComplete="tel"
              className={inputClass}
              placeholder="0812…"
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-500">{t.ticketing.guestSupportHint}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label
              htmlFor="guest-trip-date"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestTripDate}
            </label>
            <input
              id="guest-trip-date"
              type="date"
              aria-label={t.ticketing.guestTripDate}
              value={tripDate}
              onChange={(event) => setTripDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="guest-id-number"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <IdCard aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestIdNumber}
            </label>
            <input
              id="guest-id-number"
              type="text"
              aria-label={t.ticketing.guestIdNumber}
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="guest-operator"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <Building2 aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestOperator}
            </label>
            <input
              id="guest-operator"
              type="text"
              aria-label={t.ticketing.guestOperator}
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="guest-journey"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <MapPinned aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestJourney}
            </label>
            <input
              id="guest-journey"
              type="text"
              aria-label={t.ticketing.guestJourney}
              value={journey}
              onChange={(event) => setJourney(event.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label
              htmlFor="guest-route-name"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <Route aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.guestRouteName}
            </label>
            <input
              id="guest-route-name"
              type="text"
              aria-label={t.ticketing.guestRouteName}
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={isSearching}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50 sm:w-auto"
        >
          {isSearching ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="h-4 w-4" />
          )}
          <span>{isSearching ? t.ticketing.guestLookupSearching : t.ticketing.guestLookupSubmit}</span>
        </button>
      </form>
    </section>
  );
};
