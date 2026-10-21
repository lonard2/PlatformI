/**
 * PlatformI - Station type/scale localized labels.
 * Raw StationType/StationScale enums must never render; they map through
 * the station dictionary section in the active locale.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis.
 */

import type { StationScale, StationType } from "@/types/transit";
import type { TranslationDictionary } from "@/lib/i18n/types";

export function getStationTypeLabel(
  type: StationType,
  t: TranslationDictionary
): string {
  switch (type) {
    case "TOD":
      return t.station.tod;
    case "RAIL_STATION":
      return t.station.railStation;
    case "BUS_TERMINAL":
      return t.station.busTerminal;
    case "AIRPORT_TERMINAL":
      return t.station.airportTerminal;
    case "HARBOR_PORT":
      return t.station.harborPort;
    case "BUS_SHELTER":
      return t.station.busShelter;
    case "BUS_POLE":
      return t.station.busPole;
  }
}

export function getStationScaleLabel(
  scale: StationScale,
  t: TranslationDictionary
): string {
  switch (scale) {
    case "SMALL":
      return t.station.scaleSmall;
    case "MEDIUM":
      return t.station.scaleMedium;
    case "BIG":
      return t.station.scaleLarge;
  }
}
