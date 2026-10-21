/**
 * PlatformI - Operating-hours time-vocabulary localization.
 * Clock ranges and timezone codes pass through untouched; Indonesian time
 * words ("24 Jam", "Sesuai Gapeka", day names) map through the dictionary.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TranslationDictionary } from "@/lib/i18n/types";

const ID_WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const T_WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Localizes the time vocabulary of an operating-hours string; times pass through. */
export function formatOperatingHours(
  hours: string,
  t: TranslationDictionary
): string {
  let out = hours;
  out = out
    .replace("Sesuai Gapeka", t.hours.perTimetable)
    .replace("Sesuai Jadwal Sandar", t.hours.perDocking)
    .replace("24 Jam", t.hours.hours24);
  ID_WEEKDAYS.forEach((idName, i) => {
    const key = T_WEEKDAYS[i];
    out = out.split(idName).join(t.weekdays[key]);
  });
  return out;
}
