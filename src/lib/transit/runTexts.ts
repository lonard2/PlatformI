/**
 * PlatformI - Generated-run text localization.
 * Closed set of generator defaults and hand-authored preset notes map
 * through the runs dictionary. User-authored run text passes through
 * untouched. Templated strings use {n}/{a}/{b} tokens.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TranslationDictionary } from "@/lib/i18n/types";

const PRESET_NOTE_KEY_BY_TRIP_CODE: Record<string, keyof TranslationDictionary["runs"]> = {
  G1012: "runNoteG1012",
  G1018: "runNoteG1018",
  "GA-404": "runNoteGA404",
  "GA-312": "runNoteGA312",
  "KA-01": "runNoteKA01",
  "A-04": "runNoteA04",
  "DT-101": "runNoteDT101",
  "TJ-108": "runNoteTJ108",
  "SB-08": "runNoteSB08",
  "M-101": "runNoteM101",
};

/** Localized note for a hand-authored preset run, or undefined when unknown. */
export function getPresetRunNote(
  tripCode: string,
  t: TranslationDictionary
): string | undefined {
  const key = PRESET_NOTE_KEY_BY_TRIP_CODE[tripCode];
  return key ? t.runs[key] : undefined;
}

/**
 * Maps generator-emitted defaults to localized labels. Anything outside the
 * closed set (user-authored service classes, notes, gate labels) is returned
 * unchanged so custom content is never mangled.
 */
export function localizeRunField(
  value: string | undefined,
  t: TranslationDictionary
): string | undefined {
  if (value === undefined) return undefined;
  switch (value) {
    case "Standard Regular":
      return t.runs.runClassStandard;
    case "Reguler Headway":
      return t.runs.runNotesRegular;
    case "Dinas Malam Masuk Dipo":
      return t.runs.runClassNightDepot;
    case "Stasiun Awal":
      return t.runs.runStationFirst;
    case "Stasiun Akhir":
      return t.runs.runStationLast;
    default:
      break;
  }
  if (value === "Peron 1") return t.runs.runBayPeron.replace("{n}", "1");

  const between = value.match(/^Antara (.+) - (.+)$/);
  if (between) {
    return t.runs.runBetween.replace("{a}", between[1]).replace("{b}", between[2]);
  }

  const depotEntry = value.match(/^(.+) \(Masuk Dipo\)$/);
  if (depotEntry) {
    return t.runs.runDepotEntry.replace("{n}", depotEntry[1]);
  }

  const nightNotes = value.match(/^Dinas Malam Masuk Dipo (.+) - Kereta Berakhir Lebih Awal$/);
  if (nightNotes) {
    return t.runs.runNightNotes.replace("{n}", nightNotes[1]);
  }

  const nightDesc = value.match(
    /^Perjalanan stabling\/dinas masuk dipo di (.+)\. Tidak melayani stasiun lanjutan\.$/
  );
  if (nightDesc) {
    return t.runs.runNightDesc.replace("{n}", nightDesc[1]);
  }

  return value;
}
