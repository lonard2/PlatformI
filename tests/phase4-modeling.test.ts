/**
 * Phase 4 verify-only sweep: prove the already-modeled pieces are real and
 * record the decisions. No new behavior is built here — these tests fail
 * only if a future change breaks the model.
 */
import { describe, it, expect } from "vitest";
import {
  itemVisibleInRegion,
  getLiveItemStatus,
  LEGACY_HOME_REGION_ID,
  type TransitSystemItem,
} from "@/components/navigation/TransportationSystemBar";
import { SKYBRIDGE_HUBS_DATA } from "@/components/inspector/SkybridgeTransferGuide";
import type { DisruptionAlert, Line } from "@/types/transit";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";
import { ja } from "@/lib/i18n/dictionaries/ja";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { ko } from "@/lib/i18n/dictionaries/ko";
import { ar } from "@/lib/i18n/dictionaries/ar";

function item(overrides: Partial<TransitSystemItem> = {}): TransitSystemItem {
  return {
    id: "mrt",
    name: "MRT",
    shortCode: "MRT",
    type: "mode",
    mode: "MRT_JAKARTA",
    icon: () => null,
    brandColor: "#fff",
    badgeLabel: "MRT",
    description: "d",
    operatingHours: "05:00-24:00",
    status: "NORMAL",
    corridorsOrBuildings: [{ lineId: "line-mrt" }],
    ...overrides,
  } as TransitSystemItem;
}

function line(overrides: Partial<Line> = {}): Line {
  return {
    id: "line-mrt",
    regionId: LEGACY_HOME_REGION_ID,
    code: "M",
    name: "MRT",
    category: "RAIL",
    mode: "MRT_JAKARTA",
    colorHex: "#fff",
    textColorHex: "#000",
  } as Line;
}

function alert(overrides: Partial<DisruptionAlert> = {}): DisruptionAlert {
  return {
    id: "a1",
    lineId: "line-mrt",
    title: "t",
    description: "d",
    severity: "WARNING",
    status: "ACTIVE",
    affectedStops: [],
    startTime: new Date().toISOString(),
    ...overrides,
  } as DisruptionAlert;
}

describe("phase 4 modeling evidence", () => {
  it("scopes catalog items by region with a Jabodetabek legacy default", () => {
    expect(itemVisibleInRegion(item(), LEGACY_HOME_REGION_ID)).toBe(true);
    expect(itemVisibleInRegion(item(), "reg-surabaya-01")).toBe(false);
    expect(itemVisibleInRegion(item({ regionIds: ["reg-surabaya-01"] }), "reg-surabaya-01")).toBe(true);
    expect(itemVisibleInRegion(item(), null)).toBe(true);
  });

  it("derives live status from DB-backed lines and active alerts", () => {
    const lines = [line()];
    expect(getLiveItemStatus(item(), [], lines)).toBe("NORMAL");
    expect(getLiveItemStatus(item(), [alert({ severity: "WARNING" })], lines)).toBe("LIMITED");
    expect(getLiveItemStatus(item(), [alert({ severity: "CRITICAL" })], lines)).toBe("SUSPENDED");
    expect(getLiveItemStatus(item(), [alert({ severity: "CRITICAL", status: "RESOLVED" })], lines)).toBe("NORMAL");
    expect(getLiveItemStatus(item(), [alert({ severity: "CRITICAL", lineId: "line-other" })], lines)).toBe("NORMAL");
  });

  it("backs every skybridge guide with curated hub data (no invented transfers)", () => {
    const hubs = Object.values(SKYBRIDGE_HUBS_DATA);
    expect(hubs.length).toBeGreaterThan(0);
    for (const hub of hubs) {
      expect(hub.hubName.trim().length).toBeGreaterThan(0);
      expect(hub.overviewDescription.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(hub.steps)).toBe(true);
      expect(hub.steps.length).toBeGreaterThan(0);
      for (const step of hub.steps) {
        expect(step.title.trim().length).toBeGreaterThan(0);
      }
    }
    expect(SKYBRIDGE_HUBS_DATA["csw-asean"]).toBeDefined();
  });

  it("states the empty region honestly in all six locales", () => {
    for (const dict of [en, id, ja, zh, ko, ar]) {
      expect(dict.navigation.noRegionCorridors.trim().length).toBeGreaterThan(0);
    }
  });
});
