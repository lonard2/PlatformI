/**
 * PlatformI - Vehicle enum display labels.
 * Seat types, AC states, photo tags, and fare-type fallbacks map through
 * the vehicle dictionary section. Unknown future values prettify instead
 * of crashing so new dataset enums never render raw SNAKE_CASE.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { TranslationDictionary } from "@/lib/i18n/types";

export function getSeatTypeLabel(
  type: string,
  t: TranslationDictionary
): string {
  switch (type) {
    case "SLEEPER_SUITE":
      return t.vehicle.seatSleeperSuite;
    case "CAPTAIN_CHAIR":
      return t.vehicle.seatCaptainChair;
    case "EXECUTIVE_RECLINER":
      return t.vehicle.seatExecRecliner;
    case "STANDARD_COACH":
      return t.vehicle.seatStandard;
    case "LONGITUDINAL_BENCH":
      return t.vehicle.seatLongBench;
    case "PRIORITY_ACCESSIBLE":
      return t.vehicle.seatPriority;
    case "WHEELCHAIR_BAY":
      return t.vehicle.seatWheelchair;
    case "BUSINESS_CLASS":
      return t.vehicle.seatBusiness;
    case "FIRST_CLASS":
      return t.vehicle.seatFirst;
    default:
      return type.replace(/_/g, " ");
  }
}

export function getAcStatusLabel(
  status: string,
  t: TranslationDictionary
): string {
  switch (status) {
    case "OPTIMAL":
      return t.vehicle.acOptimal;
    case "COOLING":
      return t.vehicle.acCooling;
    case "MAINTENANCE":
      return t.vehicle.acMaintenance;
    default:
      return status.replace(/_/g, " ");
  }
}

export function getPhotoTagLabel(tag: string, t: TranslationDictionary): string {
  switch (tag) {
    case "EXTERIOR_THREE_QUARTER":
      return t.vehicle.tagExterior34;
    case "INTERIOR_CABIN":
      return t.vehicle.tagInteriorCabin;
    case "TRACKSIDE_ACTION":
      return t.vehicle.tagTrackside;
    case "HIGH_SPEED_AERODYNAMIC":
      return t.vehicle.tagAero;
    case "INTERIOR_FIRST_CLASS":
      return t.vehicle.tagFirstInterior;
    case "STATION_PLATFORM":
      return t.vehicle.tagStationPlatform;
    case "COACHBUILDER_FLAGSHIP":
      return t.vehicle.tagCoachbuilder;
    case "SLEEPER_SUITES_INTERIOR":
      return t.vehicle.tagSleeperInterior;
    case "COCKPIT_CONTROLS":
      return t.vehicle.tagCockpit;
    case "EXECUTIVE_INTERIOR":
      return t.vehicle.tagExecInterior;
    case "CAPTAIN_SEATS":
      return t.vehicle.tagCaptainSeats;
    case "BRT_DEDICATED_BUSWAY":
      return t.vehicle.tagBrtBusway;
    case "BOARDING_PLATFORM":
      return t.vehicle.tagBoarding;
    case "MARITIME_SPEEDBOAT":
      return t.vehicle.tagSpeedboat;
    case "OUTBOARD_POWERTRAIN":
      return t.vehicle.tagOutboard;
    default:
      return tag.replace(/_/g, " ");
  }
}

/** Last-resort fare label when a fare type has no dictionary mapping. */
export function getFareFallbackLabel(
  fareType: string,
  t: TranslationDictionary
): string {
  return `${t.vehicle.fareUnknown} (${fareType})`;
}

const FEATURE_KEY_BY_CODE: Record<string, keyof TranslationDictionary["vehicle"]> = {
  "150_DEGREE_RECLINE": "feat150Recline",
  "24INCH_AVOD_SCREEN": "feat24Avod",
  ARMREST: "featArmrest",
  COMPLIMENTARY_SNACK: "featSnack",
  CUP_HOLDER: "featCupHolder",
  ERGONOMIC_CONTOUR_SEAT: "featErgoSeat",
  FIRST_CLASS_PLUSH_LEATHER: "featFirstLeather",
  FOLD_OUT_OAK_DESK: "featOakDesk",
  FOOTREST: "featFootrest",
  HEADREST_WING: "featHeadrest",
  LEG_REST: "featLegRest",
  MARINE_VINYL_CUSHION: "featMarineCushion",
  MOTORIZED_RECLINE_140: "featMotorRecline",
  PANORAMIC_OCEAN_VIEW: "featOceanView",
  PERSONAL_24V_OUTLET: "featOutlet24v",
  PRIVACY_CURTAIN: "featPrivacy",
  READING_LIGHT: "featReadingLight",
  RECLINING_BACKREST: "featReclineBack",
  RECLINING_SEAT: "featReclineSeat",
  SEATBELT: "featSeatbelt",
  SINGLE_VIP_SEAT: "featVipSeat",
  TYPE_I_LIFE_JACKET_UNDER_SEAT: "featLifeJacket",
  UNDER_SEAT_USB_C: "featUsbC",
  USB_C_FAST_CHARGE: "featUsbFast",
  USB_OUTLET: "featUsbOutlet",
  USB_PD_FAST_CHARGE: "featUsbPd",
  USB_PORT: "featUsbPort",
  VIP_CAPTAIN_CHAIR: "featVipCaptain",
  WATERPROOF_STORAGE_NET: "featNet",
};

/** Localized amenity feature label; unknown codes prettify instead of crashing. */
export function getFeatureLabel(feature: string, t: TranslationDictionary): string {
  const key = FEATURE_KEY_BY_CODE[feature];
  return key ? t.vehicle[key] : feature.replace(/_/g, " ");
}
