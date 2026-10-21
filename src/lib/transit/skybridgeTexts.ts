/**
 * PlatformI - Skybridge guide text localization.
 * Hand-authored guide content (overviews, accessibility, step titles,
 * instructions, facilities, subtitles) maps through the sky dictionary
 * section. Proper nouns (hub/mode/line/place names, codes) and location
 * identifiers (level descriptions) pass through untouched.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TranslationDictionary } from "@/lib/i18n/types";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

type SkyKey = keyof TranslationDictionary["sky"];

const CONTENT_KEYS: SkyKey[] = [
  "sbSubCsw",
  "sbSubDukuh",
  "sbSubHalim",
  "sbSubManggarai",
  "sbOverCsw",
  "sbOverDukuh",
  "sbOverHalim",
  "sbOverManggarai",
  "sbAccGlassElev",
  "sbAccEscalators",
  "sbAccTactile",
  "sbAccTapGate",
  "sbAccTravelator",
  "sbAccRamp",
  "sbAccTactilePath",
  "sbAccRetail",
  "sbAccGlassWalk",
  "sbAccBaggage",
  "sbAccCart",
  "sbAccZeroStep",
  "sbAccEscBank",
  "sbAccMobElev",
  "sbAccConcourse",
  "sbAccMarkings",
  "sbFacFareGates",
  "sbFacTactile",
  "sbFacCustomerDesk",
  "sbFacRetail",
  "sbFacMusholla",
  "sbFacRestroom",
  "sbFacHiEscalator",
  "sbFacAdaElev",
  "sbFacAutoDoors",
  "sbFacNextBus",
  "sbFacTvm",
  "sbFacTravelators",
  "sbFacSecurity",
  "sbFacBikeRamp",
  "sbFacDownEsc",
  "sbFacLiftKrl",
  "sbFacTunnel",
  "sbFacTicketGates",
  "sbFacBaggage",
  "sbFacTelemetry",
  "sbFacAc",
  "sbFacIntercom",
  "sbFacLrtGates",
  "sbFacEscElev",
  "sbFacSignage",
  "sbFacLiftConcourse",
  "sbFacServiceCenter",
  "sbFacAtm",
  "sbFacCafe",
  "sbFacLounge",
  "sbT0",
  "sbT1",
  "sbT2",
  "sbT3",
  "sbT4",
  "sbT5",
  "sbT6",
  "sbT7",
  "sbT8",
  "sbT9",
  "sbT10",
  "sbT11",
  "sbT12",
  "sbT13",
  "sbI0",
  "sbI1",
  "sbI2",
  "sbI3",
  "sbI4",
  "sbI5",
  "sbI6",
  "sbI7",
  "sbI8",
  "sbI9",
  "sbI10",
  "sbI11",
  "sbI12",
  "sbI13",
];

const SOURCE_TO_KEY = new Map<string, SkyKey>();
for (const key of CONTENT_KEYS) {
  SOURCE_TO_KEY.set(en.sky[key], key);
  SOURCE_TO_KEY.set(id.sky[key], key);
}

/** Localizes known guide content; names, codes, and levels pass through. */
export function localizeSkybridgeText(value: string, t: TranslationDictionary): string {
  const key = SOURCE_TO_KEY.get(value);
  return key ? t.sky[key] : value;
}
