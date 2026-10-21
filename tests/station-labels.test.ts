/**
 * PlatformI - Station type/scale label tests (B1).
 * Raw StationType/StationScale enums must never render; they map through
 * localized labels in every language.
 */

import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { id } from "@/lib/i18n/dictionaries/id";

describe("station labels", () => {
  it("maps every StationType and scale through the dictionary", async () => {
    const { getStationTypeLabel, getStationScaleLabel } = await import(
      "@/lib/transit/stationLabels"
    );
    expect(getStationTypeLabel("BUS_SHELTER", en)).toBe("Bus Shelter");
    expect(getStationTypeLabel("BUS_SHELTER", id)).toBe("Halte");
    expect(getStationTypeLabel("RAIL_STATION", en)).toBe("Rail Station");
    expect(getStationTypeLabel("TOD", id)).toBe("Kawasan TOD");
    expect(getStationTypeLabel("HARBOR_PORT", en)).toBe("Harbor / Port");
    expect(getStationTypeLabel("AIRPORT_TERMINAL", en)).toBe(
      "Airport Terminal"
    );
    expect(getStationTypeLabel("BUS_TERMINAL", en)).toBe("Bus Terminal");
    expect(getStationTypeLabel("BUS_POLE", id)).toBe("Rambu Bus Stop");
    expect(getStationScaleLabel("SMALL", en)).toBe("Small");
    expect(getStationScaleLabel("BIG", id)).toBe("Besar");
  });
});
