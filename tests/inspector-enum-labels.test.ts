/**
 * E1 evidence: every inspector enum maps to a localized label in all six
 * locales (no raw SNAKE_CASE at render sites); unknown future values
 * prettify instead of crashing.
 */
import { describe, it, expect } from "vitest";
import {
  getSeatTypeLabel,
  getAcStatusLabel,
  getPhotoTagLabel,
  getFeatureLabel,
  getFareFallbackLabel,
} from "@/lib/transit/vehicleLabels";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { ar } from "@/lib/i18n/dictionaries/ar";

const dicts = { en, id, ja, zh, ko, ar };

describe("inspector enum labels", () => {
  it("maps seat types, AC states, and fare fallbacks in all locales", () => {
    for (const [locale, t] of Object.entries(dicts)) {
      for (const seat of ["SLEEPER_SUITE", "CAPTAIN_CHAIR", "EXECUTIVE_RECLINER", "STANDARD_COACH", "LONGITUDINAL_BENCH", "PRIORITY_ACCESSIBLE", "WHEELCHAIR_BAY", "BUSINESS_CLASS", "FIRST_CLASS"]) {
        const label = getSeatTypeLabel(seat, t);
        expect(label.length, `${locale}:${seat}`).toBeGreaterThan(0);
        expect(label, `${locale}:${seat}`).not.toContain("_");
      }
      for (const status of ["OPTIMAL", "COOLING", "MAINTENANCE"]) {
        expect(getAcStatusLabel(status, t).length, `${locale}:${status}`).toBeGreaterThan(0);
      }
      expect(getFareFallbackLabel("FLAT_FARE", t)).toContain("FLAT_FARE");
    }
  });

  it("maps photo tags and amenity features in all locales", () => {
    for (const [locale, t] of Object.entries(dicts)) {
      for (const tag of ["EXTERIOR_THREE_QUARTER", "INTERIOR_CABIN", "COCKPIT_CONTROLS", "MARITIME_SPEEDBOAT"]) {
        const label = getPhotoTagLabel(tag, t);
        expect(label.length, `${locale}:${tag}`).toBeGreaterThan(0);
        expect(label, `${locale}:${tag}`).not.toContain("_");
      }
      for (const feature of ["RECLINING_SEAT", "USB_C_FAST_CHARGE", "CUP_HOLDER", "PRIVACY_CURTAIN"]) {
        const label = getFeatureLabel(feature, t);
        expect(label.length, `${locale}:${feature}`).toBeGreaterThan(0);
        expect(label, `${locale}:${feature}`).not.toContain("_");
      }
    }
  });

  it("prettifies unknown future enum values instead of crashing", () => {
    for (const t of Object.values(dicts)) {
      expect(getSeatTypeLabel("FUTURE_HYPERLOOP_POD", t)).toBe("FUTURE HYPERLOOP POD");
      expect(getAcStatusLabel("DEFROSTING", t)).toBe("DEFROSTING");
      expect(getFeatureLabel("ZERO_GRAVITY_MODE", t)).toBe("ZERO GRAVITY MODE");
    }
  });
});
