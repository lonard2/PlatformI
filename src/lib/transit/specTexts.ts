/**
 * PlatformI - Technical spec sentence localization.
 * Hand-authored default spec sentences (torque blurbs, safety lines,
 * historical notes) map through the vehicle dictionary section. Genuine
 * per-vehicle spec data (VEHICLE_TECHNICAL_SPECS, custom technicalSpec)
 * passes through untouched.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TranslationDictionary } from "@/lib/i18n/types";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

type VehicleKey = keyof TranslationDictionary["vehicle"];

const LOCALIZABLE_KEYS: VehicleKey[] = [
  "specTqMrt",
  "specHistMrt",
  "specSafeMrt1",
  "specSafeMrt2",
  "specSafeMrt3",
  "specSafeMrt4",
  "specTqWhoosh",
  "specHistWhoosh",
  "specSafeWhoosh1",
  "specSafeWhoosh2",
  "specSafeWhoosh3",
  "specSafeWhoosh4",
  "specTqLrtjab",
  "specHistLrtjab",
  "specSafeLrtjab1",
  "specSafeLrtjab2",
  "specSafeLrtjab3",
  "specSafeLrtjab4",
  "specTqLrtjkt",
  "specHistLrtjkt",
  "specSafeLrtjkt1",
  "specSafeLrtjkt2",
  "specSafeLrtjkt3",
  "specTqKrl",
  "specHistKrl",
  "specSafeKrl1",
  "specSafeKrl2",
  "specSafeKrl3",
  "specTqBrt",
  "specHistBrt",
  "specSafeBrt1",
  "specSafeBrt2",
  "specSafeBrt3",
  "specSafeBrt4",
  "specTqAkap",
  "specHistAkap",
  "specSafeAkap1",
  "specSafeAkap2",
  "specSafeAkap3",
  "specSafeAkap4",
  "specTqShuttle",
  "specHistShuttle",
  "specSafeShuttle1",
  "specSafeShuttle2",
  "specSafeShuttle3",
  "specVipCapacity",
];

const SOURCE_TO_KEY = new Map<string, VehicleKey>();
for (const key of LOCALIZABLE_KEYS) {
  SOURCE_TO_KEY.set(en.vehicle[key], key);
  SOURCE_TO_KEY.set(id.vehicle[key], key);
}

/** Localizes a known default spec sentence; unknown text passes through. */
export function localizeSpecText(value: string, t: TranslationDictionary): string {
  const key = SOURCE_TO_KEY.get(value);
  return key ? t.vehicle[key] : value;
}
