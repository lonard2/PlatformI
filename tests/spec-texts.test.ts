/**
 * PlatformI - Technical spec sentence localization tests (E2).
 * Default spec sentences localize; genuine per-vehicle data passes through.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

describe("spec texts", () => {
  it("localizes known default sentences and passes through the rest", async () => {
    const { localizeSpecText } = await import("@/lib/transit/specTexts");
    expect(
      localizeSpecText(
        "Rangkaian kereta rel berat pertama dalam sejarah transit bawah tanah Jakarta. Beroperasi dalam formasi 6 kereta (4M2T) pada rel Cape Gauge 1067mm.",
        en
      )
    ).toContain("Jakarta's first heavy metro");
    expect(
      localizeSpecText(
        "Continuous 6,200 Nm tractive effort @ start with jerk limitation control",
        id
      )
    ).toContain("Traksi kontinu");
    expect(localizeSpecText("Custom depot note", en)).toBe(
      "Custom depot note"
    );
  });
});
