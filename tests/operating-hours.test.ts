/**
 * PlatformI - Operating-hours vocabulary tests (B2).
 * Times stay; Indonesian time words map through the dictionary.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";

describe("formatOperatingHours", () => {
  it("keeps clock ranges untouched and localizes time vocabulary", async () => {
    const { formatOperatingHours } = await import(
      "@/lib/transit/operatingHours"
    );
    expect(formatOperatingHours("05:00 - 24:00 WIB", en)).toBe(
      "05:00 - 24:00 WIB"
    );
    expect(formatOperatingHours("24 Jam", en)).toBe("24 Hours");
    expect(formatOperatingHours("24 Jam", id)).toBe("24 Jam");
    expect(formatOperatingHours("24 Jam (AMARI)", en)).toBe(
      "24 Hours (AMARI)"
    );
    expect(formatOperatingHours("24 Jam Sesuai Gapeka", en)).toBe(
      "24 Hours per timetable"
    );
    expect(formatOperatingHours("Sesuai Jadwal Sandar", id)).toBe(
      "Sesuai jadwal sandar"
    );
    expect(
      formatOperatingHours("10:00 - 18:00 WIB (Selasa - Minggu)", en)
    ).toBe("10:00 - 18:00 WIB (Tuesday - Sunday)");
    expect(
      formatOperatingHours("10:00 - 18:00 WIB (Selasa - Minggu)", ja)
    ).toBe("10:00 - 18:00 WIB (火曜日 - 日曜日)");
  });
});
