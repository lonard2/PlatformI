/**
 * PlatformI - Intercity buyer form with account prefill and manual fallback.
 * Field visibility is driven by the per-mode sales matrix: full name, phone,
 * and email are always required; the ID field is required exactly when the
 * matrix says so; the meal field appears only when the fare includes it;
 * drop-off is a fixed operator-list select (never free text) and renders
 * only for shuttle modes, so rail never shows drop-off and AKAP never shows
 * an address-as-drop-off field.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide icons.
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  IdCard,
  Mail,
  MapPin,
  Phone,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { OPERATOR_POINT_LISTS, getSalesRules } from "@/lib/transit/salesMatrix";
import type { TransitMode } from "@/types/transit";

export interface BuyerPrefill {
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface BuyerRecord {
  fullName: string;
  phone: string;
  email: string;
  sex?: string;
  address?: string;
  idNumber?: string;
  meal?: string;
  prayerNote?: string;
  dropOffPointId?: string;
}

export interface BuyerFormProps {
  prefill?: BuyerPrefill;
  mode: TransitMode;
  serviceClass?: string;
  onValid: (buyer: BuyerRecord) => void;
}

/** Shuttle operators whose own pool lists back the drop-off select. */
const SHUTTLE_DROP_OFF_OPERATORS: string[] = [
  "DayTrans",
  "Baraya Travel",
  "CitiTrans",
  "Bhinneka Shuttle",
];

/**
 * Resolves the fixed drop-off choices for shuttle checkout. Values always
 * come from the operator point lists, so a free-text address can never be
 * submitted as a drop-off point.
 */
export function resolveDropOffPoints(): string[] {
  const seen = new Set<string>();
  const points: string[] = [];
  for (const operator of SHUTTLE_DROP_OFF_OPERATORS) {
    const list = OPERATOR_POINT_LISTS[operator] ?? [];
    for (const point of list) {
      if (!seen.has(point)) {
        seen.add(point);
        points.push(point);
      }
    }
  }
  return points;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (invalid: boolean): string =>
  `w-full rounded-xl border bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-offset-1 focus:outline-cyan-400 ${
    invalid ? "border-rose-500/70" : "border-slate-700"
  }`;

export const BuyerForm: React.FC<BuyerFormProps> = ({
  prefill,
  mode,
  serviceClass,
  onValid,
}) => {
  const { t } = useTranslation();
  const rules = useMemo(
    () => getSalesRules(mode, serviceClass),
    [mode, serviceClass]
  );
  const showMeal = rules.meal === "included";
  const showDropOff = rules.dropOff === "operator-list";
  const dropOffPoints = useMemo(
    () => (showDropOff ? resolveDropOffPoints() : []),
    [showDropOff]
  );

  const [fullName, setFullName] = useState<string>(prefill?.fullName ?? "");
  const [phone, setPhone] = useState<string>(prefill?.phone ?? "");
  const [email, setEmail] = useState<string>(prefill?.email ?? "");
  const [idNumber, setIdNumber] = useState<string>("");
  const [meal, setMeal] = useState<string>("");
  const [dropOffPointId, setDropOffPointId] = useState<string>("");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Account prefill may arrive after mount; fill only fields the buyer has
  // not typed into yet so late account data never clobbers manual fallback.
  useEffect(() => {
    if (prefill?.fullName && fullName === "") setFullName(prefill.fullName);
    if (prefill?.phone && phone === "") setPhone(prefill.phone);
    if (prefill?.email && email === "") setEmail(prefill.email);
  }, [prefill, fullName, phone, email]);

  const isInvalid = (field: string): boolean => invalidFields.includes(field);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const invalid: string[] = [];
    if (fullName.trim() === "") invalid.push("fullName");
    if (phone.trim() === "") invalid.push("phone");
    if (!EMAIL_PATTERN.test(email.trim())) invalid.push("email");
    if (rules.idRequired && idNumber.trim() === "") invalid.push("idNumber");
    if (showDropOff && !dropOffPoints.includes(dropOffPointId)) {
      invalid.push("dropOffPointId");
    }

    if (invalid.length > 0) {
      setInvalidFields(invalid);
      return;
    }
    setInvalidFields([]);

    const buyer: BuyerRecord = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
    };
    const trimmedId = idNumber.trim();
    if (trimmedId !== "") buyer.idNumber = trimmedId;
    const trimmedMeal = meal.trim();
    if (showMeal && trimmedMeal !== "") buyer.meal = trimmedMeal;
    if (showDropOff) buyer.dropOffPointId = dropOffPointId;
    onValid(buyer);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t.ticketing.buyerTitle}
      className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <UserRound aria-hidden="true" className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-bold">{t.ticketing.buyerTitle}</h3>
      </div>

      {invalidFields.length > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t.ticketing.buyerFixErrors}</span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="buyer-full-name"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <UserRound aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
            {t.ticketing.buyerFullName}
          </label>
          <input
            id="buyer-full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={isInvalid("fullName")}
            className={inputClass(isInvalid("fullName"))}
          />
        </div>

        <div>
          <label
            htmlFor="buyer-phone"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
            {t.ticketing.buyerPhone}
          </label>
          <input
            id="buyer-phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={isInvalid("phone")}
            className={inputClass(isInvalid("phone"))}
          />
        </div>

        <div>
          <label
            htmlFor="buyer-email"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
            {t.ticketing.buyerEmail}
          </label>
          <input
            id="buyer-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={isInvalid("email")}
            className={inputClass(isInvalid("email"))}
          />
        </div>

        <div>
          <label
            htmlFor="buyer-id-number"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <IdCard aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
            {t.ticketing.buyerIdNumber}
          </label>
          <input
            id="buyer-id-number"
            type="text"
            autoComplete="off"
            required={rules.idRequired}
            value={idNumber}
            onChange={(event) => setIdNumber(event.target.value)}
            aria-invalid={isInvalid("idNumber")}
            className={inputClass(isInvalid("idNumber"))}
          />
        </div>

        {showMeal && (
          <div>
            <label
              htmlFor="buyer-meal"
              className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <UtensilsCrossed aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
              {t.ticketing.buyerMeal}
            </label>
            <input
              id="buyer-meal"
              type="text"
              autoComplete="off"
              placeholder={t.ticketing.buyerMealPlaceholder}
              value={meal}
              onChange={(event) => setMeal(event.target.value)}
              className={inputClass(false)}
            />
          </div>
        )}
      </div>

      {showDropOff && (
        <div>
          <label
            htmlFor="buyer-drop-off"
            className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
            {t.ticketing.buyerDropOff}
          </label>
          <select
            id="buyer-drop-off"
            required
            value={dropOffPointId}
            onChange={(event) => setDropOffPointId(event.target.value)}
            aria-invalid={isInvalid("dropOffPointId")}
            className={inputClass(isInvalid("dropOffPointId"))}
          >
            <option value="">{t.ticketing.buyerDropOffPlaceholder}</option>
            {dropOffPoints.map((point) => (
              <option key={point} value={point}>
                {point}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        <span>{t.ticketing.buyerSubmit}</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </form>
  );
};
