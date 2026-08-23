/**
 * PlatformI - Multi-Language (i18n), Multi-Month Calendar & Historical Uptime Test Suite
 *
 * Validates dictionary integrity across Indonesian, English, Japanese, Chinese, Korean, and Arabic,
 * verifies multi-month historical incident logs, and tests multi-window uptime calculations (30d/90d/180d/365d).
 */

import { describe, it, expect } from "vitest";
import { DICTIONARIES, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/i18n";
import { HISTORICAL_INCIDENTS, SYSTEM_UPTIME_METRICS } from "@/lib/data/jakarta-dataset";

describe("Milestone 6: Multi-Language (i18n) & Historical Analytics", () => {
  describe("1. Multi-Language Dictionary Completeness Audit", () => {
    const requiredLanguages: SupportedLanguage[] = ["id", "en", "ja", "zh", "ko", "ar"];

    it("supports all 6 primary languages with valid metadata", () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(6);
      requiredLanguages.forEach((langCode) => {
        const meta = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
        expect(meta).toBeDefined();
        expect(meta?.nativeName).toBeTruthy();
        expect(meta?.dir).toBe(langCode === "ar" ? "rtl" : "ltr");
      });
    });

    it("has 100% complete and non-empty keys for every language dictionary", () => {
      requiredLanguages.forEach((lang) => {
        const dict = DICTIONARIES[lang];
        expect(dict).toBeDefined();

        // Common keys
        expect(dict.common.appName).toBe("PlatformI");
        expect(dict.common.search).toBeTruthy();
        expect(dict.common.normal).toBeTruthy();
        expect(dict.common.onTime).toBeTruthy();
        expect(dict.common.delayed).toBeTruthy();
        expect(dict.common.selectLanguage).toBeTruthy();

        // Navigation keys
        expect(dict.navigation.systemStatus).toBeTruthy();
        expect(dict.navigation.liveFleet).toBeTruthy();
        expect(dict.navigation.allModes).toBeTruthy();
        expect(dict.navigation.railModes).toBeTruthy();
        expect(dict.navigation.busModes).toBeTruthy();

        // Status Center & Calendar keys
        expect(dict.statusCenter.title).toBeTruthy();
        expect(dict.statusCenter.tabLive).toBeTruthy();
        expect(dict.statusCenter.tabHistory).toBeTruthy();
        expect(dict.statusCenter.tabUptime).toBeTruthy();
        expect(dict.statusCenter.calendarTitle).toBeTruthy();
        expect(dict.statusCenter.timeframe30Days).toBeTruthy();
        expect(dict.statusCenter.timeframe90Days).toBeTruthy();
        expect(dict.statusCenter.timeframe180Days).toBeTruthy();
        expect(dict.statusCenter.timeframe365Days).toBeTruthy();
        expect(dict.statusCenter.monthlyTrendTitle).toBeTruthy();
        expect(dict.statusCenter.mon).toBeTruthy();
        expect(dict.statusCenter.sun).toBeTruthy();

        // Vehicle Inspector keys
        expect(dict.vehicleInspector.speed).toBeTruthy();
        expect(dict.vehicleInspector.bearing).toBeTruthy();
        expect(dict.vehicleInspector.passengerDensity).toBeTruthy();
        expect(dict.vehicleInspector.tabSpecs).toBeTruthy();
        expect(dict.vehicleInspector.tabCarriages).toBeTruthy();

        // Hub Inspector keys
        expect(dict.hubInspector.tabDepartures).toBeTruthy();
        expect(dict.hubInspector.tabDestinations).toBeTruthy();
        expect(dict.hubInspector.tabFacilities).toBeTruthy();
        expect(dict.hubInspector.tabSkybridge).toBeTruthy();
      });
    });
  });

  describe("2. Multi-Month Historical Incident & Calendar Logs Audit", () => {
    it("contains historical records spanning multiple months", () => {
      expect(HISTORICAL_INCIDENTS.length).toBeGreaterThanOrEqual(15);

      const months = new Set(HISTORICAL_INCIDENTS.map((h) => h.date.substring(0, 7)));
      // Should span August, July, June, May, April 2026
      expect(months.has("2026-08")).toBe(true);
      expect(months.has("2026-07")).toBe(true);
      expect(months.has("2026-06")).toBe(true);
      expect(months.has("2026-05")).toBe(true);
      expect(months.has("2026-04")).toBe(true);
    });

    it("ensures every incident log has complete root cause, mitigation, and valid duration", () => {
      HISTORICAL_INCIDENTS.forEach((event) => {
        expect(event.id).toBeTruthy();
        expect(event.lineCode).toBeTruthy();
        expect(event.lineName).toBeTruthy();
        expect(event.title).toBeTruthy();
        expect(event.description).toBeTruthy();
        expect(event.rootCause).toBeTruthy();
        expect(event.mitigationAction).toBeTruthy();
        expect(event.durationMinutes).toBeGreaterThan(0);
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe("3. Multi-Window Historical Uptime Analytics & KPI Audit", () => {
    it("provides 30-day, 90-day, 180-day, and 365-day uptime metrics for all systems", () => {
      expect(SYSTEM_UPTIME_METRICS.length).toBeGreaterThanOrEqual(10);

      SYSTEM_UPTIME_METRICS.forEach((sys) => {
        expect(sys.systemName).toBeTruthy();
        expect(sys.uptimePercent30Days).toBeGreaterThan(90);
        expect(sys.uptimePercent90Days).toBeGreaterThan(90);
        expect(sys.uptimePercent180Days).toBeGreaterThan(90);
        expect(sys.uptimePercent365Days).toBeGreaterThan(90);
        expect(sys.onTimePerformancePercent).toBeGreaterThan(90);
        expect(sys.mttrMinutes).toBeGreaterThan(0);
        expect(sys.statusHistory7Days.length).toBe(7);
      });
    });

    it("has 12-month historical monthly breakdown for each transit operator", () => {
      SYSTEM_UPTIME_METRICS.forEach((sys) => {
        expect(sys.monthlyHistory).toBeDefined();
        expect(sys.monthlyHistory.length).toBe(12);

        sys.monthlyHistory.forEach((rec) => {
          expect(rec.monthKey).toMatch(/^\d{4}-\d{2}$/);
          expect(rec.monthLabel).toBeTruthy();
          expect(rec.uptimePercent).toBeGreaterThan(90);
          expect(rec.onTimePerformancePercent).toBeGreaterThan(90);
          expect(rec.totalTrips).toBeGreaterThan(0);
        });
      });
    });

    it("verifies aggregate network uptime calculations across timeframes", () => {
      const count = SYSTEM_UPTIME_METRICS.length;
      const avg30d =
        SYSTEM_UPTIME_METRICS.reduce((acc, s) => acc + s.uptimePercent30Days, 0) / count;
      const avg90d =
        SYSTEM_UPTIME_METRICS.reduce((acc, s) => acc + s.uptimePercent90Days, 0) / count;
      const avg180d =
        SYSTEM_UPTIME_METRICS.reduce((acc, s) => acc + s.uptimePercent180Days, 0) / count;
      const avg365d =
        SYSTEM_UPTIME_METRICS.reduce((acc, s) => acc + s.uptimePercent365Days, 0) / count;

      expect(avg30d).toBeGreaterThan(96.0);
      expect(avg90d).toBeGreaterThan(96.0);
      expect(avg180d).toBeGreaterThan(96.0);
      expect(avg365d).toBeGreaterThan(96.0);
    });
  });
});
