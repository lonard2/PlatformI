/**
 * PlatformI - Generated-run text localization tests (D2c).
 * Generator defaults and preset notes map through the dictionary;
 * user-authored text passes through untouched.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

describe("run texts", () => {
  it("maps generator defaults to localized labels", async () => {
    const { localizeRunField } = await import("@/lib/transit/runTexts");
    expect(localizeRunField("Standard Regular", en)).toBe("Standard Regular");
    expect(localizeRunField("Reguler Headway", id)).toBe("Headway Reguler");
    expect(localizeRunField("Stasiun Awal", en)).toBe("First Station");
    expect(localizeRunField("Stasiun Akhir", en)).toBe("Last Station");
    expect(localizeRunField("Antara Gambir - Bekasi", id)).toBe(
      "Antara Gambir - Bekasi"
    );
    expect(localizeRunField("Antara Gambir - Bekasi", en)).toBe(
      "Between Gambir - Bekasi"
    );
    expect(localizeRunField("Peron 1", en)).toBe("Peron 1");
    expect(localizeRunField("Custom user note", en)).toBe("Custom user note");
    expect(localizeRunField(undefined, en)).toBeUndefined();
  });

  it("maps preset trip codes to localized notes", async () => {
    const { getPresetRunNote } = await import("@/lib/transit/runTexts");
    expect(getPresetRunNote("G1012", en)).toContain("350 km/h");
    expect(getPresetRunNote("G1012", id)).toContain("350 km/jam");
    expect(getPresetRunNote("UNKNOWN", en)).toBeUndefined();
  });
});
