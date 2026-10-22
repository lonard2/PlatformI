/**
 * PlatformI - Per-mode ticket sales matrix.
 * Single source of truth for which purchase options each intercity mode
 * may offer, so buyers are never shown a fake choice (no rail drop-off,
 * no free Argo Executive meal, no AKAP door drop-off, shuttle drop-off
 * restricted to the operator's own point list).
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TransitMode } from "@/types/transit";

export type MealRule = "included" | "paid" | "none";
export type BaggageRule = "included" | "paid" | "none";
export type DropOffRule = "operator-list" | "none";

export interface SalesRules {
  seatMap: boolean;
  meal: MealRule;
  baggage: BaggageRule;
  dropOff: DropOffRule;
  idRequired: boolean;
}

/**
 * Fixed pickup/drop point lists per shuttle and travel operator.
 * Shuttle drop-off must be chosen from the operator's own list;
 * free-text addresses are never accepted. Indonesian proper nouns
 * stay untranslated.
 */
export const OPERATOR_POINT_LISTS: Record<string, string[]> = {
  DayTrans: [
    "Pool DayTrans Pasteur",
    "Pool DayTrans Dipatiukur",
    "Pool DayTrans Cihampelas",
    "Pool DayTrans Cibubur",
    "Pool DayTrans Bekasi",
    "Pool DayTrans Tangerang",
  ],
  "Baraya Travel": [
    "Pool Baraya Buah Batu",
    "Pool Baraya Pasteur",
    "Pool Baraya Cikini",
    "Pool Baraya Bekasi",
    "Pool Baraya Soekarno-Hatta",
  ],
  CitiTrans: [
    "Pool CitiTrans Pasteur",
    "Pool CitiTrans Cihampelas",
    "Pool CitiTrans Cibubur",
    "Pool CitiTrans Kelapa Gading",
  ],
  "Bhinneka Shuttle": [
    "Pool Bhinneka Cicaheum",
    "Pool Bhinneka Cibubur",
    "Pool Bhinneka Slipi",
  ],
  "Sinar Jaya": [
    "Terminal Pulo Gebang",
    "Terminal Kampung Rambutan",
    "Terminal Kalideres",
    "Terminal Lebak Bulus",
    "Agen Cikarang",
  ],
  "Rosalia Indah": [
    "Terminal Pulo Gebang",
    "Terminal Kampung Rambutan",
    "Pool Ciputat",
    "Agen Bekasi Timur",
  ],
};

const STRICTEST_SAFE_RULES: SalesRules = {
  seatMap: true,
  meal: "none",
  baggage: "none",
  dropOff: "none",
  idRequired: true,
};

function includesToken(serviceClass: string | undefined, tokens: string[]): boolean {
  if (!serviceClass) return false;
  const lowered = serviceClass.toLowerCase();
  return tokens.some((token) => lowered.includes(token));
}

const KAI_MEAL_INCLUDED_CLASS_TOKENS = ["luxury", "suite"];
const WHOOSH_MEAL_INCLUDED_CLASS_TOKENS = ["first"];
const LCC_CARRIER_TOKENS = [
  "lion",
  "citilink",
  "wings",
  "super air jet",
  "airasia",
  "air asia",
];

/** KAI intercity: seat map on every class, never a drop-off field, ID required. */
function kaiIntercityRules(serviceClass?: string): SalesRules {
  return {
    seatMap: true,
    meal: includesToken(serviceClass, KAI_MEAL_INCLUDED_CLASS_TOKENS)
      ? "included"
      : "paid",
    baggage: "included",
    dropOff: "none",
    idRequired: true,
  };
}

/** Whoosh: seat map on every class, First class adds meal handling, ID required. */
function whooshRules(serviceClass?: string): SalesRules {
  return {
    seatMap: true,
    meal: includesToken(serviceClass, WHOOSH_MEAL_INCLUDED_CLASS_TOKENS)
      ? "included"
      : "none",
    baggage: "included",
    dropOff: "none",
    idRequired: true,
  };
}

/** Flights: LCC carriers charge meal and baggage; full-service includes both. */
function flightRules(serviceClass?: string): SalesRules {
  const isLcc =
    !serviceClass || includesToken(serviceClass, LCC_CARRIER_TOKENS);
  return {
    seatMap: true,
    meal: isLcc ? "paid" : "included",
    baggage: isLcc ? "paid" : "included",
    dropOff: "none",
    idRequired: true,
  };
}

/**
 * Per-mode sales rules. Unknown future modes fall back to the strictest
 * safe rule: seat map on, no meal, no drop-off, ID required.
 */
export function getSalesRules(
  mode: TransitMode,
  serviceClass?: string
): SalesRules {
  switch (mode) {
    case "KAI_INTERCITY":
    case "KAI_BANDARA":
      return kaiIntercityRules(serviceClass);
    case "WHOOSH_HSR":
      return whooshRules(serviceClass);
    case "AIRPORT_COMMERCIAL":
      return flightRules(serviceClass);
    case "AKAP_INTERCITY_BUS":
      return {
        seatMap: true,
        meal: "none",
        baggage: "included",
        dropOff: "none",
        idRequired: false,
      };
    case "EXECUTIVE_SHUTTLE":
      return {
        seatMap: true,
        meal: "none",
        baggage: "included",
        dropOff: "operator-list",
        idRequired: false,
      };
    case "MARITIME_PELNI":
      return {
        seatMap: true,
        meal: "included",
        baggage: "included",
        dropOff: "none",
        idRequired: true,
      };
    case "MARITIME_SPEEDBOAT":
      return {
        seatMap: true,
        meal: "none",
        baggage: "included",
        dropOff: "none",
        idRequired: false,
      };
    case "MRT_JAKARTA":
    case "LRT_JABODEBEK_CIBUBUR":
    case "LRT_JABODEBEK_BEKASI":
    case "LRT_JAKARTA":
    case "KRL_BOGOR":
    case "KRL_CIKARANG":
    case "KRL_RANGKASBITUNG":
    case "KRL_TANGERANG":
    case "KRL_TANJUNG_PRIOK":
    case "TRANSJAKARTA_BRT":
    case "TRANSJAKARTA_NON_BRT":
    case "MIKROTRANS":
      return {
        seatMap: false,
        meal: "none",
        baggage: "none",
        dropOff: "none",
        idRequired: false,
      };
    default:
      return { ...STRICTEST_SAFE_RULES };
  }
}
