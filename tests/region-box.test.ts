// tests/region-box.test.ts
import { describe, it, expect } from "vitest";
import { isInsideJabodetabek } from "@/lib/transit/regionBox";
import { selectVisibleVehicles } from "@/components/map/VehicleMarkerLayer";
import type { Vehicle } from "@/types/transit";

function makeVehicle(id: string, lat: number, lng: number): Vehicle {
  return {
    id,
    lineId: "line-mrt",
    vehicleCode: id,
    name: id,
    category: "RAIL",
    mode: "MRT_JAKARTA",
    currentLatitude: lat,
    currentLongitude: lng,
    headingDegrees: 0,
    speedKmh: 40,
    status: "IN_SERVICE",
    crowdLevel: "LEVEL_1_MANY_SEATS",
    acComfort: "COLD",
    coachbuilder: "Nippon Sharyo",
    chassis: "MRT Jakarta TS",
    progressFraction: 0.5,
    currentSegmentIndex: 0,
    nextStopId: "stop-mrt-dka",
    nextStopEtaSeconds: 60,
  } as Vehicle;
}

describe("region box", () => {
  it("keeps Gambir inside and Surabaya outside", () => {
    expect(isInsideJabodetabek(-6.176, 106.83)).toBe(true);
    expect(isInsideJabodetabek(-7.265, 112.745)).toBe(false);
  });

  it("hides outside-region vehicles from the map layer", () => {
    const insideVehicle = makeVehicle("veh-inside", -6.176, 106.83);
    const outsideVehicle = makeVehicle("veh-outside", -7.265, 112.745);
    const visible = selectVisibleVehicles([insideVehicle, outsideVehicle]);
    expect(visible.map((v) => v.id)).toEqual([insideVehicle.id]);
  });
});
