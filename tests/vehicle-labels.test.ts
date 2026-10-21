/**
 * PlatformI - Vehicle enum label tests (E1).
 * Seat types, AC states, photo tags, and fare fallbacks localize;
 * unknown future values pass through instead of crashing.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

describe("vehicle labels", () => {
  it("maps seat types, AC states, photo tags, and fare types", async () => {
    const { getSeatTypeLabel, getAcStatusLabel, getPhotoTagLabel, getFareFallbackLabel } = await import(
      "@/lib/transit/vehicleLabels"
    );
    expect(getSeatTypeLabel("SLEEPER_SUITE", en)).toBe("Sleeper Suite");
    expect(getSeatTypeLabel("CAPTAIN_CHAIR", id)).toBe("Kursi Kapten");
    expect(getSeatTypeLabel("FIRST_CLASS", en)).toBe("First Class");
    expect(getAcStatusLabel("OPTIMAL", en)).toBe("Optimal");
    expect(getAcStatusLabel("COOLING", id)).toBe("Pendinginan");
    expect(getPhotoTagLabel("EXTERIOR_THREE_QUARTER", en)).toBe(
      "Exterior Three-Quarter"
    );
    expect(getPhotoTagLabel("MARITIME_SPEEDBOAT", id)).toBe(
      "Speedboat Maritim"
    );
    expect(getPhotoTagLabel("SOME_FUTURE_TAG", en)).toBe("SOME FUTURE TAG");
    expect(getFareFallbackLabel("FLAT", en)).toBe("Unknown fare (FLAT)");
  });
});
