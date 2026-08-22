/**
 * PlatformI - Multi-Modal Fare Calculation Engine & JakLingko Integrated Tariff Service
 *
 * Implements:
 * - Mode-specific distance/station/tiered tariff formulas (TransJakarta, MRT, LRT, KRL, Whoosh, KAI Bandara, Speedboat)
 * - Early bird discounts (05:00 - 07:00) & peak/off-peak rates
 * - JakLingko 3-Hour Integrated Tariff Cap: Enforcing Rp 10,000 maximum ceiling across MRT + LRT + TransJakarta
 *   when transfers occur within 45 minutes and total elapsed time <= 180 minutes (3 hours).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { TransitMode } from "@/types/transit";

export type TransitModeType =
  | "mrt"
  | "lrt_jabodebek"
  | "lrt_jakarta"
  | "krl"
  | "whoosh"
  | "kai_bandara"
  | "kai_intercity"
  | "tj_brt"
  | "tj_non_brt"
  | "mikrotrans"
  | "akap_bus"
  | "executive_shuttle"
  | "aviation"
  | "maritime"
  | TransitMode;

export interface FareCalculationOptions {
  isPeak?: boolean;
  stationCount?: number;
  departureHour?: number;
  seatClass?: "economy" | "business" | "first" | "executive";
}

export interface JakLingkoLegInput {
  mode: TransitModeType;
  distanceKm: number;
  tapInTime: Date;
  tapOutTime: Date;
  stationCount?: number;
  isPeak?: boolean;
}

export interface JakLingkoTripBreakdown {
  legIndex: number;
  mode: TransitModeType;
  legFareRp: number;
  rawFareRp: number;
}

export interface JakLingkoTripResult {
  totalFareRp: number;
  rawFareRp: number;
  isCapped: boolean;
  discountRp: number;
  isTransferValid: boolean;
  breakdown: JakLingkoTripBreakdown[];
}

/**
 * Normalizes any TransitMode or string to canonical calculation mode.
 */
export function normalizeModeKey(mode: TransitModeType | string): string {
  const m = mode.toString().toUpperCase();
  if (m === "MRT" || m === "MRT_JAKARTA") return "mrt";
  if (m === "LRT_JABODEBEK" || m === "LRT_JABODEBEK_CIBUBUR" || m === "LRT_JABODEBEK_BEKASI") return "lrt_jabodebek";
  if (m === "LRT_JAKARTA") return "lrt_jakarta";
  if (m.startsWith("KRL")) return "krl";
  if (m === "WHOOSH" || m === "WHOOSH_HSR") return "whoosh";
  if (m === "KAI_BANDARA") return "kai_bandara";
  if (m === "KAI_INTERCITY") return "kai_intercity";
  if (m === "TRANSJAKARTA_BRT" || m === "TJ_BRT") return "tj_brt";
  if (m === "TRANSJAKARTA_NON_BRT" || m === "TJ_NON_BRT") return "tj_non_brt";
  if (m === "MIKROTRANS") return "mikrotrans";
  if (m === "AKAP_BUS" || m === "AKAP_INTERCITY_BUS") return "akap_bus";
  if (m === "EXECUTIVE_SHUTTLE") return "executive_shuttle";
  if (m === "AVIATION" || m === "AIRPORT_COMMERCIAL") return "aviation";
  if (m === "MARITIME" || m === "MARITIME_SPEEDBOAT" || m === "MARITIME_PELNI") return "maritime";
  return mode.toLowerCase();
}

/**
 * Calculates single leg fare for a specific transit mode.
 */
export function calculateLegFare(
  mode: TransitModeType | string,
  distanceKm: number,
  options?: FareCalculationOptions
): number {
  const dist = Math.max(0, distanceKm);
  const opts = options || {};
  const canonicalMode = normalizeModeKey(mode);

  switch (canonicalMode) {
    case "tj_brt":
    case "tj_non_brt": {
      // Early bird fare: 05:00 - 07:00 (departureHour 5 or 6)
      if (opts.departureHour !== undefined && opts.departureHour >= 5 && opts.departureHour < 7) {
        return 2000;
      }
      return 3500;
    }

    case "mikrotrans":
      return 0; // 100% Subsidized JakLingko MikroTrans

    case "lrt_jakarta":
      return 5000; // Flat fare across Pegangsaan Dua - Velodrome

    case "mrt": {
      // Base Rp 3,000 + Rp 1,000 per station or per km (capped at Rp 14,000 max)
      const count = opts.stationCount !== undefined ? opts.stationCount : Math.ceil(dist);
      const fare = 3000 + Math.max(0, count) * 1000;
      return Math.min(14000, fare);
    }

    case "lrt_jabodebek": {
      // First 1 km = Rp 5,000, subsequent = Rp 700 / km (ceil)
      const extraKm = Math.ceil(Math.max(0, dist - 1));
      const rawFare = 5000 + extraKm * 700;
      const isPeak = opts.isPeak ?? false;
      const maxCap = isPeak ? 20000 : 10000;
      return Math.min(maxCap, rawFare);
    }

    case "krl": {
      // Base Rp 3,000 for first 25 km + Rp 1,000 per additional 10 km (ceil)
      if (dist <= 25) return 3000;
      const additionalKm = dist - 25;
      const extraSegments = Math.ceil(additionalKm / 10);
      return 3000 + extraSegments * 1000;
    }

    case "whoosh": {
      if (opts.seatClass === "first") return 600000;
      if (opts.seatClass === "business") return 450000;
      return 225000; // Premium Economy default
    }

    case "kai_bandara": {
      if (opts.seatClass === "executive") return 70000;
      return 50000; // Premium service default
    }

    case "kai_intercity": {
      if (opts.seatClass === "first") return 550000;
      if (opts.seatClass === "executive") return 380000;
      if (opts.seatClass === "business") return 250000;
      return 150000; // Economy
    }

    case "maritime": {
      if (dist > 30) return 74000; // Long distance island hop (e.g. Harapan, Kelapa)
      return 54000; // Short distance (Pari, Untung Jawa)
    }

    case "executive_shuttle":
      return 110000; // DayTrans / CitiTrans average

    case "akap_bus":
      return 185000; // AKAP Executive average

    default:
      return 3500;
  }
}

/**
 * Checks if a transit mode is eligible for JakLingko integrated tariff.
 */
export function isJakLingkoEligibleMode(mode: TransitModeType | string): boolean {
  const canonical = normalizeModeKey(mode);
  const eligible = ["mrt", "lrt_jabodebek", "lrt_jakarta", "tj_brt", "tj_non_brt", "mikrotrans"];
  return eligible.includes(canonical);
}

/**
 * Calculates integrated JakLingko fare enforcing 3-hour Rp 10,000 cap across MRT, LRT, and TransJakarta.
 */
export function calculateJakLingkoTripFare(legs: JakLingkoLegInput[]): JakLingkoTripResult {
  if (legs.length === 0) {
    return {
      totalFareRp: 0,
      rawFareRp: 0,
      isCapped: false,
      discountRp: 0,
      isTransferValid: true,
      breakdown: [],
    };
  }

  // Calculate raw unintegrated standalone total
  let rawTotal = 0;
  const rawBreakdowns = legs.map((leg, idx) => {
    const rawLegFare = calculateLegFare(leg.mode, leg.distanceKm, {
      stationCount: leg.stationCount,
      departureHour: leg.tapInTime.getHours(),
      isPeak: leg.isPeak,
    });
    rawTotal += rawLegFare;
    return { legIndex: idx, mode: leg.mode, rawFareRp: rawLegFare };
  });

  const tripStartTime = legs[0].tapInTime.getTime();
  let isTransferValid = true;

  for (let i = 0; i < legs.length; i++) {
    const currentLeg = legs[i];
    if (!isJakLingkoEligibleMode(currentLeg.mode)) {
      isTransferValid = false;
      break;
    }

    if (i > 0) {
      const prevLeg = legs[i - 1];
      const transferGapMinutes =
        (currentLeg.tapInTime.getTime() - prevLeg.tapOutTime.getTime()) / (1000 * 60);
      const totalElapsedMinutes =
        (currentLeg.tapOutTime.getTime() - tripStartTime) / (1000 * 60);

      // Max transfer gap is 45 minutes; Max total journey time is 180 minutes (3 hours)
      if (transferGapMinutes > 45 || totalElapsedMinutes > 180) {
        isTransferValid = false;
        break;
      }
    }
  }

  if (!isTransferValid) {
    return {
      totalFareRp: rawTotal,
      rawFareRp: rawTotal,
      isCapped: false,
      discountRp: 0,
      isTransferValid: false,
      breakdown: rawBreakdowns.map((b) => ({ ...b, legFareRp: b.rawFareRp })),
    };
  }

  // Integrated Tariff: Base boarding fee Rp 2,500 + Rp 500/km (Rp 250/45s)
  let integratedAccumulator = 2500;
  for (const leg of legs) {
    if (normalizeModeKey(leg.mode) === "mikrotrans") continue;
    integratedAccumulator += Math.round(leg.distanceKm * 500);
  }

  const finalFare = Math.min(10000, integratedAccumulator);
  const isCapped = integratedAccumulator >= 10000 || finalFare < rawTotal;
  const discountRp = Math.max(0, rawTotal - finalFare);

  const breakdown: JakLingkoTripBreakdown[] = legs.map((leg, idx) => {
    const rawF = rawBreakdowns[idx].rawFareRp;
    const proportion = rawTotal > 0 ? rawF / rawTotal : 1 / legs.length;
    return {
      legIndex: idx,
      mode: leg.mode,
      legFareRp: Math.round(finalFare * proportion),
      rawFareRp: rawF,
    };
  });

  return {
    totalFareRp: finalFare,
    rawFareRp: rawTotal,
    isCapped,
    discountRp,
    isTransferValid: true,
    breakdown,
  };
}

/**
 * Formats Indonesian Rupiah currency cleanly.
 */
export function formatRupiah(amountRp: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amountRp);
}
